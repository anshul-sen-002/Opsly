package com.opsly.job.dto;

import com.opsly.job.entity.JobStatus;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
public class JobResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private Long technicianId;
    private String technicianName;
    private JobStatus status;
    private String description;
    private Instant scheduledAt;
    private Instant createdAt;
    private Instant updatedAt;
}