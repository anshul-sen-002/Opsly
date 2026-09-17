package com.opsly.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.config.AiConfig;
import com.opsly.ai.dto.ChatResponse;
import com.opsly.ai.dto.ChatResponse.ToolCallRecord;
import com.opsly.ai.tool.ToolRegistry;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Core AI chat service - the agent loop.
 *
 * Flow per request:
 *   1. Build the conversation: system prompt + user message
 *   2. Call Amazon Bedrock (Converse API) with all available tools
 *   3. If the model returns toolUse blocks -> run each one via ToolRegistry (authorized) and feed
 *      the toolResult blocks back
 *   4. Repeat until the model returns a plain text answer or the iteration limit is reached
 *
 * Security: ToolRegistry enforces role-based authorization on every tool call.
 * The model itself is never trusted to make authorization decisions.
 */
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final int MAX_ITERATIONS = 8;

    private final AiConfig config;
    private final ToolRegistry toolRegistry;
    private final RestClient bedrockClient;
    private final ObjectMapper mapper;

    public ChatResponse chat(String userMessage, User caller) {
        if (!config.isConfigured()) {
            return ChatResponse.builder()
                    .message("AI assistant is not configured. Please set AWS_BEDROCK_API_KEY and BEDROCK_MODEL_ID.")
                    .build();
        }

        String systemPrompt = systemPrompt(caller);
        List<ObjectNode> messages = new ArrayList<>();
        messages.add(userMessage(userMessage));

        List<ToolCallRecord> toolCallHistory = new ArrayList<>();

        for (int i = 0; i < MAX_ITERATIONS; i++) {
            JsonNode response = callLlm(systemPrompt, messages);

            if (response == null) {
                return error("Failed to reach the AI service. Please try again.", toolCallHistory);
            }

            JsonNode assistantMessage = response.path("output").path("message");
            List<JsonNode> toolUses = toolUses(assistantMessage);

            if (!toolUses.isEmpty()) {
                // Append the assistant turn exactly as Bedrock returned it: it carries the toolUse ids
                messages.add((ObjectNode) assistantMessage);

                for (JsonNode toolUse : toolUses) {
                    String toolUseId = toolUse.path("toolUseId").asText();
                    String name      = toolUse.path("name").asText();
                    String argsJson  = toolUse.path("input").toString();

                    String result = toolRegistry.execute(name, argsJson, caller);
                    boolean success = !result.startsWith("Error:");

                    toolCallHistory.add(ToolCallRecord.builder()
                            .tool(name)
                            .result(result)
                            .success(success)
                            .build());

                    messages.add(toolResultMessage(toolUseId, result));
                }
            } else {
                // The model produced its final text answer
                String content = textOf(assistantMessage);
                return ChatResponse.builder()
                        .message(content != null && !content.isBlank() ? content : "Done.")
                        .toolCalls(toolCallHistory.isEmpty() ? null : toolCallHistory)
                        .build();
            }
        }

        return error("Reached maximum iterations without a final response.", toolCallHistory);
    }

    /**
     * One call to the Bedrock Converse API:
     * POST {endpoint}/model/{modelId}/converse
     */
    private JsonNode callLlm(String systemPrompt, List<ObjectNode> messages) {
        ObjectNode body = mapper.createObjectNode();

        body.putArray("system").addObject().put("text", systemPrompt);

        ArrayNode msgArray = body.putArray("messages");
        messages.forEach(msgArray::add);

        ObjectNode toolConfig = body.putObject("toolConfig");
        toolConfig.putArray("tools").addAll(toolSpecs());
        toolConfig.putObject("toolChoice").putObject("auto");

        ObjectNode inferenceConfig = body.putObject("inferenceConfig");
        inferenceConfig.put("maxTokens", config.getMaxTokens());
        inferenceConfig.put("temperature", config.getTemperature());

        try {
            String bodyJson = mapper.writeValueAsString(body);
            URI uri = URI.create(config.getEndpoint() + "/model/" + config.getModelId() + "/converse");
            return bedrockClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(bodyJson)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            return null;
        }
    }

    /** Adapts the tool registry definitions to Bedrock's toolSpec shape. */
    private ArrayNode toolSpecs() {
        ArrayNode tools = mapper.createArrayNode();
        for (JsonNode definition : toolRegistry.getDefinitions()) {
            if (definition == null || definition.isNull()) {
                continue;
            }
            JsonNode function = definition.path("function");
            if (function.isMissingNode() || function.isNull()) {
                continue;
            }
            String name = function.path("name").asText(null);
            if (name == null || name.isBlank()) {
                continue;
            }
            ObjectNode spec = tools.addObject().putObject("toolSpec");
            spec.put("name", name);
            spec.put("description", function.path("description").asText(""));
            JsonNode parameters = function.path("parameters");
            if (parameters.isMissingNode() || parameters.isNull()) {
                parameters = mapper.createObjectNode();
            }
            ObjectNode inputSchema = mapper.createObjectNode();
            inputSchema.set("json", parameters.deepCopy());
            spec.set("inputSchema", inputSchema);
        }
        return tools;
    }

    /** System prompt - Bedrock receives it as a separate top-level "system" block, not a message. */
    private String systemPrompt(User caller) {
        return """
                You are Opsly AI, an assistant for a service operations platform.
                You help users manage jobs, customers, technicians, invoices, and payments.

                Authenticated user: %s | Role: %s | Date: %s

                Rules:
                - Use tools to answer requests. Call multiple tools if needed.
                - Your role determines which tools you can use. Do not attempt operations outside your role.
                - Never ask for information you can get from a tool call.
                - Be concise and factual in your responses.
                - If a tool returns an Error, explain it clearly and suggest what the user can do.
                - Reply Always in the same language , in which user is asking to you.
                - If the Question is a normal generl knowledge, answer it based on your Ai capablilites.
                """.formatted(caller.getEmail(), caller.getRole(), LocalDate.now());
    }

    private ObjectNode userMessage(String content) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "user");
        msg.putArray("content").addObject().put("text", content);
        return msg;
    }

    /** Tool results travel back to Bedrock as a user turn containing toolResult blocks. */
    private ObjectNode toolResultMessage(String toolUseId, String result) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "user");
        ObjectNode toolResult = msg.putArray("content").addObject().putObject("toolResult");
        toolResult.put("toolUseId", toolUseId);
        toolResult.putArray("content").addObject().put("text", result);
        return msg;
    }

    /** Every toolUse block in an assistant message (empty when the model answered with text only). */
    private List<JsonNode> toolUses(JsonNode assistantMessage) {
        List<JsonNode> toolUses = new ArrayList<>();
        for (JsonNode block : assistantMessage.path("content")) {
            if (block.has("toolUse")) {
                toolUses.add(block.get("toolUse"));
            }
        }
        return toolUses;
    }

    /** Concatenates the text blocks of an assistant message. */
    private String textOf(JsonNode assistantMessage) {
        StringBuilder text = new StringBuilder();
        for (JsonNode block : assistantMessage.path("content")) {
            if (block.has("text")) {
                if (text.length() > 0) text.append('\n');
                text.append(block.get("text").asText());
            }
        }
        return text.length() == 0 ? null : text.toString();
    }
    

    private ChatResponse error(String message, List<ToolCallRecord> history) {
        return ChatResponse.builder()
                .message(message)
                .toolCalls(history.isEmpty() ? null : history)
                .build();
    }
}