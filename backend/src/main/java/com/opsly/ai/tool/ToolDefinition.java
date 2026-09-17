package com.opsly.ai.tool;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;

import java.util.Set;

/**
 * Describes a single tool the LLM can call.
 *
 * @param name          Tool name used by the LLM (snake_case)
 * @param description   Plain-English description for the LLM
 * @param parameters    JSON Schema object describing accepted parameters
 * @param allowedRoles  Roles that may invoke this tool. Empty = no restriction beyond auth.
 * @param executor      Lambda that performs the actual backend operation
 */
public record ToolDefinition(
        String name,
        String description,
        ObjectNode parameters,
        Set<Role> allowedRoles,
        ToolExecutor executor
) {
    /** Returns true if the authenticated user is allowed to call this tool. */
    public boolean isAllowedFor(User user) {
        if (allowedRoles.isEmpty()) return true;
        return allowedRoles.contains(user.getRole());
    }
}