package com.opsly.job.entity;

/**
 * Official Job lifecycle:
 * PENDING     - created, waiting for assignment
 * ASSIGNED    - technician assigned by Admin/Manager
 * IN_PROGRESS - technician started work
 * COMPLETED   - technician finished work
 * CLOSED      - Admin/Manager verified and closed
 */
public enum JobStatus {
    PENDING,
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    CLOSED
}
