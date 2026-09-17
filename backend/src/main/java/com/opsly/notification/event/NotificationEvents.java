package com.opsly.notification.event;

import com.opsly.invoice.entity.InvoiceStatus;
import com.opsly.job.entity.JobStatus;

import java.math.BigDecimal;

/**
 * Business events published by the services. NotificationListener turns these
 * into persistent notifications AFTER the originating transaction commits.
 * Services stay decoupled from the notification package — they only publish facts.
 */
public final class NotificationEvents {

    private NotificationEvents() {
    }

    /** Admin/Manager assigned a technician — notify the technician's account */
    public record JobAssignedEvent(Long jobId, Long technicianUserId) {
    }

    /** Job created by a customer or staff — notify admin/manager staff roles */
    public record JobCreatedEvent(Long jobId, Long customerUserId, Long customerId, String customerName) {
    }

    /** Job moved to a new status — notify staff roles, assigned technician and optionally the customer's account */
    public record JobStatusEvent(Long jobId, Long customerUserId, Long technicianUserId, JobStatus newStatus) {
    }

    /** Invoice issued — notify the customer's account (customerUserId is null when no login) */
    public record InvoiceIssuedEvent(Long invoiceId, Long customerUserId, String invoiceNumber,
                                     BigDecimal totalAmount, InvoiceStatus status) {
    }

    /** Payment recorded — notify admins/managers */
    public record PaymentReceivedEvent(Long invoiceId, String invoiceNumber, BigDecimal amount) {
    }

    /** Customer self-registered via the portal — notify admins/managers */
    public record CustomerRegisteredEvent(String customerName, String customerEmail) {
    }
}