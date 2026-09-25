package com.opsly.user.dto;

import com.opsly.common.validation.PhonePatterns;
import com.opsly.user.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * Request to update a staff account (ADMIN, MANAGER, or TECHNICIAN).
 * Only used by ADMIN/MANAGER-authorized endpoints.
 */
@Getter
@Setter
public class UpdateStaffRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    /**
     * Allowed values: ADMIN, MANAGER, TECHNICIAN.
     * Backend validates and rejects CUSTOMER role here.
     */
    @NotNull(message = "Role is required")
    private Role role;

    // Optional for every staff role — but validated when a value is supplied
    @Pattern(regexp = PhonePatterns.OPTIONAL, message = PhonePatterns.MESSAGE)
    private String phone;

    private String specialization;
}