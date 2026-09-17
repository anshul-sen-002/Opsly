package com.opsly.job.entity;

import com.opsly.customer.entity.Customer;
import com.opsly.technician.entity.Technician;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Job represents the complete service lifecycle from customer request to final closure.
 * "Service Request" and "Job" are the same entity — do not create separate tables.
 *
 * Relationships:
 *   Customer  1 ─── N  Job
 *   Technician 1 ─── N  Job  (nullable — assigned later)
 */
@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    /**
     * Nullable — technician is assigned after job creation (ASSIGNED status).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private Technician technician;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private JobStatus status = JobStatus.PENDING;

    @Column(nullable = false, length = 1000)
    private String description;

    // Optional scheduled date/time for the service
    private LocalDateTime scheduledAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
