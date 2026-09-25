package com.opsly.auth.dto;

import com.opsly.common.validation.PhonePatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Pattern(regexp = PhonePatterns.REQUIRED, message = PhonePatterns.MESSAGE)
    private String phone;
}