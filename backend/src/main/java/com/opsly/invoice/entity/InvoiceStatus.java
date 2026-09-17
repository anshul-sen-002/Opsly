package com.opsly.invoice.entity;

/**
 * Invoice statuses are INDEPENDENT from Job statuses.
 * A closed job does not automatically mean the invoice is paid.
 */
public enum InvoiceStatus {
    DRAFT,
    ISSUED,
    PARTIALLY_PAID,
    PAID,
    OVERDUE
}
