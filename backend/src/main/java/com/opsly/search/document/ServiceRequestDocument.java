package com.opsly.search.document;

import com.opsly.job.dto.JobResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * OpenSearch projection of a service request (the {@code Job} entity — the only
 * work-item concept in Opsly). PostgreSQL stays the source of truth; this is only
 * indexed for keyword search. Fields that do not exist on {@code Job} yet
 * (title, category, priority) are optional so the mapping stays forward-compatible.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceRequestDocument {

    private Long requestId;
    private String title;
    private String description;
    private String customerName;
    private String technicianName;
    private String status;
    private String priority;
    private String category;

    public static ServiceRequestDocument from(JobResponse job) {
        return ServiceRequestDocument.builder()
                .requestId(job.getId())
                .title("Service request #" + job.getId())
                .description(job.getDescription())
                .customerName(job.getCustomerName())
                .technicianName(job.getTechnicianName())
                .status(job.getStatus() != null ? job.getStatus().name() : null)
                .priority(null)
                .category(null)
                .build();
    }
}
