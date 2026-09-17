package com.opsly.ai.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.opsly.user.entity.User;

/**
 * Executes one tool call.
 * Implementations parse the LLM-supplied JSON arguments, call the appropriate
 * service, and return a plain-text result that is fed back to the LLM.
 */
@FunctionalInterface
public interface ToolExecutor {
    String execute(JsonNode args, User caller);
}