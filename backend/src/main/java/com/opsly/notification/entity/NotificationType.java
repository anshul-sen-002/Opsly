package com.opsly.notification.entity;

/**
 * Type of a notification — drives the icon/color shown in the UI.
 */
public enum NotificationType {
    JOB_CREATED,
    JOB_ASSIGNED,
    JOB_STARTED,
    JOB_COMPLETED,
    JOB_CLOSED,
    INVOICE_ISSUED,
    PAYMENT_RECEIVED,
    CUSTOMER_REGISTERED
}