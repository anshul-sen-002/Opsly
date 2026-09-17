package com.opsly.user.dto;

import com.opsly.user.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request to create a staff account (ADMIN, MANAGER, or TECHNICIAN).
 * Only used by ADMIN-authorized endpoints.
 */
@Getter
@Setter
public class CreateStaffRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * Allowed values: ADMIN, MANAGER, TECHNICIAN.
     * Backend validates and rejects CUSTOMER role here.
     */
    @NotNull(message = "Role is required")
    private Role role;

    // Only required for TECHNICIAN role
    private String phone;
    private String specialization;
}