package com.opsly.ai.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.definition.AdminTools;
import com.opsly.ai.tool.definition.CustomerTools;
import com.opsly.ai.tool.definition.ManagerTools;
import com.opsly.ai.tool.definition.TechnicianTools;
import com.opsly.user.entity.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Central registry of all AI tools.
 * Collected from four role-groups: Admin, Manager, Technician, Customer.
 * Enforces role-based authorization on every tool execution (mirrors @PreAuthorize).
 */
@Service
@RequiredArgsConstructor
public class ToolRegistry {

    private final AdminTools adminTools;
    private final ManagerTools managerTools;
    private final TechnicianTools technicianTools;
    private final CustomerTools customerTools;
    private final ObjectMapper mapper;

    private final Map<String, ToolDefinition> registry = new LinkedHashMap<>();
    private List<JsonNode> toolDefinitionsForLlm;

    @PostConstruct
    public void init() {
        register(adminTools.getTools());
        register(managerTools.getTools());
        register(technicianTools.getTools());
        register(customerTools.getTools());

        toolDefinitionsForLlm = new ArrayList<>();
        for (ToolDefinition td : registry.values()) {
            ObjectNode def = mapper.createObjectNode();
            def.put("type", "function");
            ObjectNode fn = def.putObject("function");
            fn.put("name", td.name());
            fn.put("description", td.description());
            fn.set("parameters", td.parameters());
            toolDefinitionsForLlm.add(def);
        }
    }

    public List<JsonNode> getDefinitions() {
        return toolDefinitionsForLlm;
    }

    /**
     * Execute a tool call from the LLM.
     * Authorization is checked here before the executor runs.
     * Returns a plain-text result string (or error) fed back to the LLM.
     */
    public String execute(String toolName, String argumentsJson, User caller) {
        ToolDefinition tool = registry.get(toolName);
        if (tool == null) {
            return "Error: Unknown tool [" + toolName + "].";
        }

        if (!tool.isAllowedFor(caller)) {
            return String.format("Error: Role %s is not allowed to use [%s]. Required: %s.",
                    caller.getRole(), toolName, tool.allowedRoles());
        }

        JsonNode args;
        try {
            args = (argumentsJson == null || argumentsJson.isBlank())
                    ? mapper.createObjectNode()
                    : mapper.readTree(argumentsJson);
        } catch (Exception e) {
            return "Error: Invalid tool arguments - " + e.getMessage();
        }

        try {
            return tool.executor().execute(args, caller);
        } catch (AccessDeniedException e) {
            return "Error: Access denied - " + e.getMessage();
        } catch (IllegalArgumentException e) {
            return "Error: Bad argument - " + e.getMessage();
        } catch (Exception e) {
            return "Error: " + e.getClass().getSimpleName() + " - " + e.getMessage();
        }
    }

    private void register(List<ToolDefinition> tools) {
        tools.forEach(t -> registry.put(t.name(), t));
    }
}