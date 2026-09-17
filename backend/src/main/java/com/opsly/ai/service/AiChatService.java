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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Core AI chat service.
 *
 * Flow per request:
 *   1. Build message history (system + user message)
 *   2. Call OpenRouter with all available tools
 *   3. If LLM returns tool_calls → execute each via ToolRegistry (authorized), feed results back
 *   4. Repeat until LLM returns a plain text response or max iterations reached
 *
 * Security: ToolRegistry enforces role-based authorization on every tool call.
 * The LLM itself is never trusted to make authorization decisions.
 */
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final int MAX_ITERATIONS = 8;

    private final AiConfig config;
    private final ToolRegistry toolRegistry;
    private final RestClient openRouterClient;
    private final ObjectMapper mapper;

    public ChatResponse chat(String userMessage, User caller) {
        if (!config.isConfigured()) {
            return ChatResponse.builder()
                    .message("AI assistant is not configured. Please set OPENROUTER_API_KEY.")
                    .build();
        }

        List<ObjectNode> messages = new ArrayList<>();
        messages.add(systemMessage(caller));
        messages.add(userMessage(userMessage));

        List<ToolCallRecord> toolCallHistory = new ArrayList<>();

        for (int i = 0; i < MAX_ITERATIONS; i++) {
            JsonNode response = callLlm(messages);

            if (response == null) {
                return error("Failed to reach the AI service. Please try again.", toolCallHistory);
            }

            JsonNode choice = response.path("choices").path(0).path("message");
            String content = textOrNull(choice, "content");
            JsonNode toolCalls = choice.has("tool_calls") ? choice.get("tool_calls") : null;

            if (toolCalls != null && toolCalls.isArray() && !toolCalls.isEmpty()) {
                // Append the assistant message that contains the tool_calls
                messages.add((ObjectNode) choice);

                // Execute each tool call and append results
                for (JsonNode tc : toolCalls) {
                    String id       = tc.path("id").asText();
                    String name     = tc.path("function").path("name").asText();
                    String argsJson = tc.path("function").path("arguments").asText();

                    String result = toolRegistry.execute(name, argsJson, caller);
                    boolean success = !result.startsWith("Error:");

                    toolCallHistory.add(ToolCallRecord.builder()
                            .tool(name)
                            .result(result)
                            .success(success)
                            .build());

                    messages.add(toolResultMessage(id, result));
                }
            } else {
                // LLM returned a final text response
                return ChatResponse.builder()
                        .message(content != null && !content.isBlank() ? content : "Done.")
                        .toolCalls(toolCallHistory.isEmpty() ? null : toolCallHistory)
                        .build();
            }
        }

        return error("Reached maximum iterations without a final response.", toolCallHistory);
    }

    private JsonNode callLlm(List<ObjectNode> messages) {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", config.getModel());
        body.put("max_tokens", config.getMaxTokens());
        body.put("temperature", config.getTemperature());

        ArrayNode msgArray = body.putArray("messages");
        messages.forEach(msgArray::add);

        body.set("tools", mapper.valueToTree(toolRegistry.getDefinitions()));
        body.put("tool_choice", "auto");

        try {
            String bodyJson = mapper.writeValueAsString(body);
            return openRouterClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(bodyJson)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            return null;
        }
    }

    private ObjectNode systemMessage(User caller) {
        String prompt = """
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

        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "system");
        msg.put("content", prompt);
        return msg;
    }

    private ObjectNode userMessage(String content) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "user");
        msg.put("content", content);
        return msg;
    }

    private ObjectNode toolResultMessage(String toolCallId, String result) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "tool");
        msg.put("tool_call_id", toolCallId);
        msg.put("content", result);
        return msg;
    }

    private String textOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private ChatResponse error(String message, List<ToolCallRecord> history) {
        return ChatResponse.builder()
                .message(message)
                .toolCalls(history.isEmpty() ? null : history)
                .build();
    }
}