package com.opsly.customer.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String companyName;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String email;
    private String address;
    private String city;
}