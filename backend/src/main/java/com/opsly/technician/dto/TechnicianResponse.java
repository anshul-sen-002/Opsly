package com.opsly.technician.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class TechnicianResponse {
    private Long id;
    private String name;
    private String phone;
    private String specialization;
    private String email; // from linked User
    private Long userId;  // id of the linked User account (for staff edit links)
    private LocalDateTime createdAt;
}