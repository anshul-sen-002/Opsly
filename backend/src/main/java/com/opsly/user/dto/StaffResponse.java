package com.opsly.user.dto;

import com.opsly.user.entity.Role;
import com.opsly.user.entity.UserStatus;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class StaffResponse {
    private Long id;
    private String email;
    private Role role;
    private UserStatus status;
    private boolean deleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private String profileImageUrl;

    // Technician profile fields — populated only for TECHNICIAN accounts
    private String name;
    private String phone;
    private String specialization;
}
