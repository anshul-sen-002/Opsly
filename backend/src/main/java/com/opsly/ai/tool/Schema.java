package com.opsly.ai.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;

/**
 * Utility for building JSON Schema parameter definitions for tool declarations.
 * Keeps tool provider code concise and consistent.
 */
public final class Schema {

    private Schema() {}

    public static ObjectNode string(ObjectMapper m, String description) {
        ObjectNode n = m.createObjectNode();
        n.put("type", "string");
        n.put("description", description);
        return n;
    }

    public static ObjectNode integer(ObjectMapper m, String description) {
        ObjectNode n = m.createObjectNode();
        n.put("type", "integer");
        n.put("description", description);
        return n;
    }

    public static ObjectNode number(ObjectMapper m, String description) {
        ObjectNode n = m.createObjectNode();
        n.put("type", "number");
        n.put("description", description);
        return n;
    }

    public static ObjectNode enumOf(ObjectMapper m, String description, String... values) {
        ObjectNode n = m.createObjectNode();
        n.put("type", "string");
        n.put("description", description);
        ArrayNode e = n.putArray("enum");
        for (String v : values) e.add(v);
        return n;
    }

    /** Builds a complete JSON Schema object node for a tool's parameters block. */
    public static ObjectNode object(ObjectMapper m, Map<String, ObjectNode> props, List<String> required) {
        ObjectNode schema = m.createObjectNode();
        schema.put("type", "object");
        ObjectNode p = schema.putObject("properties");
        props.forEach(p::set);
        if (required != null && !required.isEmpty()) {
            ArrayNode req = schema.putArray("required");
            required.forEach(req::add);
        }
        return schema;
    }

    /** Shortcut for a no-parameter tool. */
    public static ObjectNode noParams(ObjectMapper m) {
        ObjectNode schema = m.createObjectNode();
        schema.put("type", "object");
        schema.putObject("properties");
        return schema;
    }

    // ---- Argument extraction helpers ----

    public static Long getLong(JsonNode args, String field) {
        require(args, field);
        return args.get(field).asLong();
    }

    public static String getString(JsonNode args, String field) {
        require(args, field);
        return args.get(field).asText();
    }

    public static String getStringOrNull(JsonNode args, String field) {
        if (!args.has(field) || args.get(field).isNull()) return null;
        return args.get(field).asText();
    }

    private static void require(JsonNode args, String field) {
        if (!args.has(field) || args.get(field).isNull())
            throw new IllegalArgumentException("Missing required parameter: " + field);
    }
}