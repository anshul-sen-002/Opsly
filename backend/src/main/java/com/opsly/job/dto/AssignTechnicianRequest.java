package com.opsly.job.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignTechnicianRequest {
    @NotNull(message = "Technician ID is required")
    private Long technicianId;
}