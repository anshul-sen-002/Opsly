package com.opsly.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Core AI chat service - the agent loop.
 *
 * Flow per request:
 * 1. Build the conversation: system message + user message
 * 2. Call OpenRouter's OpenAI-compatible /v1/chat/completions with all
 * available tools
 * 3. If the model returns tool_calls -> run each one via ToolRegistry
 * (authorized) and feed
 * the results back as "tool" messages
 * 4. Repeat until the model returns a plain text answer or the iteration limit
 * is reached
 *
 * Security: ToolRegistry enforces role-based authorization on every tool call.
 * The model itself is never trusted to make authorization decisions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private static final int MAX_ITERATIONS = 8;

    private final AiConfig config;
    private final ToolRegistry toolRegistry;
    private final RestClient openRouterClient;
    private final ObjectMapper mapper;

    public ChatResponse chat(String userMessage, User caller) {
        if (!config.isConfigured()) {
            return ChatResponse.builder()
                    .message("AI assistant is not configured. Please set OPENROUTER_API_KEY and OPENROUTER_MODEL.")
                    .build();
        }

        List<ObjectNode> messages = new ArrayList<>();
        messages.add(systemMessage(systemPrompt(caller)));
        messages.add(userMessage(userMessage));

        List<ToolCallRecord> toolCallHistory = new ArrayList<>();

        for (int i = 0; i < MAX_ITERATIONS; i++) {
            JsonNode response;
            try {
                response = callLlm(messages);
            } catch (RestClientResponseException e) {
                // The AI server answered with an error status: log it and surface the real
                // reason. 401 par response body bhi include karo taaki OpenRouter ka
                // asli message ("User not found." vs "No auth credentials...") dikhe.
                String responseBody = e.getResponseBodyAsString();
                String reason = aiReason(responseBody);
                log.error("OpenRouter chat call failed: status={} reason={} body={} model={} baseUrl={}",
                        e.getStatusCode().value(), reason, truncateForLog(responseBody),
                        config.getModel(), config.getBaseUrl());
                return error("AI service error (" + e.getStatusCode().value() + "): " + reason, toolCallHistory);
            } catch (Exception e) {
                // Network, timeout or serialization failure — keep the cause visible
                log.error("OpenRouter chat call failed: {}", describe(e), e);
                return error("Failed to reach the AI service: " + describe(e), toolCallHistory);
            }

            if (response == null) {
                log.error("OpenRouter chat call returned an empty response body");
                return error("Failed to reach the AI service. Please try again.", toolCallHistory);
            }

            JsonNode assistantMessage = response.path("choices").path(0).path("message");
            List<JsonNode> toolCalls = toolCalls(assistantMessage);

            if (!toolCalls.isEmpty()) {
                // Echo the assistant turn back: it carries the tool_call ids the results refer
                // to
                messages.add(assistantTurn(assistantMessage));

                for (JsonNode toolCall : toolCalls) {
                    String callId = toolCall.path("id").asText();
                    String name = toolCall.path("function").path("name").asText();
                    String argsJson = argumentsOf(toolCall);

                    String result = toolRegistry.execute(name, argsJson, caller);
                    boolean success = !result.startsWith("Error:");

                    toolCallHistory.add(ToolCallRecord.builder()
                            .tool(name)
                            .result(result)
                            .success(success)
                            .build());

                    messages.add(toolResultMessage(callId, result));
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
     * One call to OpenRouter's OpenAI-compatible chat API:
     * POST {baseUrl}/v1/chat/completions
     */
    private JsonNode callLlm(List<ObjectNode> messages) {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", config.getModel());

        ArrayNode msgArray = body.putArray("messages");
        messages.forEach(msgArray::add);

        // ToolRegistry already publishes OpenAI-shaped function definitions
        ArrayNode tools = body.putArray("tools");
        toolRegistry.getDefinitions().forEach(tools::add);
        body.put("tool_choice", "auto");

        body.put("stream", false);
        body.put("max_tokens", config.getMaxTokens());
        body.put("temperature", config.getTemperature());

        String bodyJson;
        try {
            bodyJson = mapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize the AI request body", e);
        }
        URI uri = URI.create(config.getBaseUrl() + "/chat/completions");
        return openRouterClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(bodyJson)
                .retrieve()
                .body(JsonNode.class);
    }

    /** System prompt - sent as the leading "system" message of the conversation. */
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
                - If the Question is a normal general knowledge, answer it based on your Ai capablilites.
                """.formatted(caller.getEmail(), caller.getRole(), LocalDate.now());
    }

    /** System prompt travels as a leading "system" message in the OpenAI format. */
    private ObjectNode systemMessage(String content) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "system");
        msg.put("content", content);
        return msg;
    }

    private ObjectNode userMessage(String content) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "user");
        msg.put("content", content);
        return msg;
    }

    /**
     * Echoes the model's own tool-calling turn back, so the results make sense to
     * it.
     */
    private ObjectNode assistantTurn(JsonNode assistantMessage) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "assistant");
        msg.put("content", assistantMessage.path("content").asText(""));
        msg.set("tool_calls", assistantMessage.get("tool_calls"));
        return msg;
    }

    /** Tool results travel back as "tool" messages keyed by the tool_call id. */
    private ObjectNode toolResultMessage(String toolCallId, String result) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", "tool");
        msg.put("tool_call_id", toolCallId);
        msg.put("content", result);
        return msg;
    }

    /**
     * Tool arguments are a JSON string in the OpenAI format; a few servers send
     * an object instead, so both shapes are accepted.
     */
    private String argumentsOf(JsonNode toolCall) {
        JsonNode arguments = toolCall.path("function").path("arguments");
        if (arguments.isMissingNode() || arguments.isNull()) {
            return "{}";
        }
        return arguments.isTextual() ? arguments.asText() : arguments.toString();
    }

    /**
     * Every tool_call in an assistant message (empty when the model answered with
     * text only).
     */
    private List<JsonNode> toolCalls(JsonNode assistantMessage) {
        List<JsonNode> calls = new ArrayList<>();
        for (JsonNode call : assistantMessage.path("tool_calls")) {
            calls.add(call);
        }
        return calls;
    }

    /** The assistant's text answer (null when it only called tools). */
    private String textOf(JsonNode assistantMessage) {
        JsonNode content = assistantMessage.path("content");
        if (content.isMissingNode() || content.isNull()) {
            return null;
        }
        String text = content.asText();
        return text.isBlank() ? null : text;
    }

    /**
     * Human-readable reason from an AI error body. Ollama reports a plain string
     * under "error" (native API) or an object carrying "message"
     * (OpenAI-compatible).
     */
    private String aiReason(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "the AI service returned no details";
        }
        try {
            JsonNode parsed = mapper.readTree(responseBody);
            JsonNode error = parsed.path("error");
            if (error.isTextual()) {
                return error.asText();
            }
            String message = error.path("message").asText(null);
            if (message == null || message.isBlank()) {
                message = parsed.path("message").asText(null);
            }
            if (message != null && !message.isBlank()) {
                return message;
            }
        } catch (Exception ignored) {
            // not JSON — fall through to the raw body
        }
        return responseBody.trim();
    }

    /**
     * Null-safe short description of a failed call, for the log and the chat reply.
     */
    private String describe(Exception e) {
        String message = e.getMessage();
        return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
    }

    /** Log spam se bachne ke liye body ko chhota rakho; key kabhi body me nahi hoti. */
    private String truncateForLog(String responseBody) {
        if (responseBody == null) {
            return "<empty>";
        }
        String trimmed = responseBody.trim();
        return trimmed.length() > 400 ? trimmed.substring(0, 400) + "..." : trimmed;
    }

    private ChatResponse error(String message, List<ToolCallRecord> history) {
        return ChatResponse.builder()
                .message(message)
                .toolCalls(history.isEmpty() ? null : history)
                .build();
    }
}