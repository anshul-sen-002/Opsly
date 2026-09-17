package com.opsly.customer.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for granting portal login access to an existing staff-created customer.
 * Admin/Manager provides an email + password to create a User account for the customer.
 */
@Getter
@Setter
public class GrantPortalAccessRequest {

    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}