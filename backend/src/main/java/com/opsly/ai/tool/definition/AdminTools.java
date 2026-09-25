package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.Schema;
import com.opsly.ai.tool.ToolDefinition;
import com.opsly.user.dto.CreateStaffRequest;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tools exclusively for ADMIN role.
 *
 * Provided tools:
 *   create_staff  — create ADMIN / MANAGER / TECHNICIAN account
 *   list_staff    — list all staff (excludes CUSTOMER role)
 *   deactivate_staff — soft-disable a staff account
 */
@Component
@RequiredArgsConstructor
public class AdminTools {

    private final AdminService adminService;
    private final ObjectMapper mapper;

    public List<ToolDefinition> getTools() {
        return List.of(createStaff(), listStaff(), deactivateStaff());
    }

    // ---- create_staff ----

    private ToolDefinition createStaff() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("name",           Schema.string(mapper, "Full name of the staff member"));
        props.put("email",          Schema.string(mapper, "Login email address"));
        props.put("password",       Schema.string(mapper, "Initial password (will be bcrypt-encoded)"));
        props.put("role",           Schema.enumOf(mapper, "Staff role", "ADMIN", "MANAGER", "TECHNICIAN"));
        props.put("phone",          Schema.string(mapper, "Phone number (required for TECHNICIAN)"));
        props.put("specialization", Schema.string(mapper, "Specialization (optional, for TECHNICIAN)"));

        return new ToolDefinition(
                "create_staff",
                "Create a new staff account (ADMIN, MANAGER, or TECHNICIAN). CUSTOMER accounts are not allowed here.",
                Schema.object(mapper, props, List.of("name", "email", "password", "role")),
                Set.of(Role.ADMIN),
                this::execCreateStaff
        );
    }

    private String execCreateStaff(JsonNode args, User caller) {
        CreateStaffRequest req = new CreateStaffRequest();
        req.setName(Schema.getString(args, "name"));
        req.setEmail(Schema.getString(args, "email"));
        req.setPassword(Schema.getString(args, "password"));
        req.setRole(Role.valueOf(Schema.getString(args, "role").toUpperCase()));
        req.setPhone(Schema.getStringOrNull(args, "phone"));
        req.setSpecialization(Schema.getStringOrNull(args, "specialization"));
        StaffResponse r = adminService.createStaff(req);
        return String.format("Staff created — ID: %d | Email: %s | Role: %s", r.getId(), r.getEmail(), r.getRole());
    }

    // ---- list_staff ----

    private ToolDefinition listStaff() {
        return new ToolDefinition(
                "list_staff",
                "List all staff accounts (ADMIN, MANAGER, TECHNICIAN). Does not include customers.",
                Schema.noParams(mapper),
                Set.of(Role.ADMIN),
                this::execListStaff
        );
    }

    private String execListStaff(JsonNode args, User caller) {
        // AI tools list active accounts only — deleted accounts stay out of chat results
        Page<StaffResponse> page = adminService.getAllStaff(PageRequest.of(0, 50), false);
        if (page.isEmpty()) return "No staff accounts found.";
        StringBuilder sb = new StringBuilder("Staff accounts (" + page.getTotalElements() + " total):\n");
        for (StaffResponse s : page.getContent()) {
            sb.append(String.format("  #%d | %s | Role: %s | Status: %s\n",
                    s.getId(), s.getEmail(), s.getRole(), s.getStatus()));
        }
        return sb.toString();
    }

    // ---- deactivate_staff ----

    private ToolDefinition deactivateStaff() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("staff_id", Schema.integer(mapper, "ID of the staff account to deactivate"));
        return new ToolDefinition(
                "deactivate_staff",
                "Deactivate a staff account (sets status to INACTIVE). The account will no longer be able to log in.",
                Schema.object(mapper, props, List.of("staff_id")),
                Set.of(Role.ADMIN),
                this::execDeactivateStaff
        );
    }

    private String execDeactivateStaff(JsonNode args, User caller) {
        StaffResponse r = adminService.deactivateStaff(Schema.getLong(args, "staff_id"), caller.getRole());
        return String.format("Staff #%d deactivated. Email: %s | Status: %s", r.getId(), r.getEmail(), r.getStatus());
    }
}