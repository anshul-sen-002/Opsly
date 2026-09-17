package com.opsly.customer.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CustomerResponse {

    private Long id;
    private String name;
    private String companyName;
    private String phone;
    private String email;
    private String address;
    private String city;
    // true if this customer has a login account
    private boolean hasLoginAccount;
    // Id of the linked User account — null when the customer has no login
    private Long userId;
    // Cloudinary profile image of the linked User account
    private String profileImageUrl;
    private boolean deleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
}
