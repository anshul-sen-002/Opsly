package com.opsly.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Response returned to the frontend after an AI chat request.
 * toolCalls is included for transparency — useful for debugging.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatResponse {

    /** Final text response from the AI */
    private final String message;

    /** Tool calls the AI made to fulfill the request */
    private final List<ToolCallRecord> toolCalls;

    @Getter
    @Builder
    public static class ToolCallRecord {
        private final String tool;
        private final String result;
        private final boolean success;
    }
}