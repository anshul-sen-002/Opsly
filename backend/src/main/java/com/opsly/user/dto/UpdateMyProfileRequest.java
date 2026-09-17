package com.opsly.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Self-service profile update for the authenticated user (PUT /api/users/me).
 * Deliberately excludes email, role and status — those are staff-management
 * fields owned by ADMIN/MANAGER via PUT /api/admin/staff/{id}.
 */
@Getter
@Setter
public class UpdateMyProfileRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    private String name;

    @Size(max = 255, message = "Phone must be at most 255 characters")
    private String phone;

    // Only applied for TECHNICIAN accounts — ignored otherwise
    @Size(max = 255, message = "Specialization must be at most 255 characters")
    private String specialization;
}