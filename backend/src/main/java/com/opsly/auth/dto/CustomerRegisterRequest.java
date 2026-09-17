package com.opsly.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Public customer self-registration request.
 * The role is NOT accepted from the client — backend sets role=CUSTOMER.
 */
@Getter
@Setter
public class CustomerRegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    // Optional phone for Customer profile
    @NotBlank(message = "Phone is required")
    private String phone;
}