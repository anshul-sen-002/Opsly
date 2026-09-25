package com.opsly.customer.dto;

import com.opsly.common.validation.PhonePatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String companyName;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = PhonePatterns.REQUIRED, message = PhonePatterns.MESSAGE)
    private String phone;

    /**
     * Required on every write — grant portal access and login identity both
     * rely on the contact email being present on the customer record.
     */
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    private String address;
    private String city;
}