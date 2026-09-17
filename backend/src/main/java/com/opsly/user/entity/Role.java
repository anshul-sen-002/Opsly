package com.opsly.user.entity;

/**
 * Roles define access level for a User account.
 * - ADMIN: full system access
 * - MANAGER: operational access (assign jobs, create invoices, etc.)
 * - TECHNICIAN: access to own assigned jobs only
 * - CUSTOMER: access to own requests, jobs, and invoices only
 */
public enum Role {
    ADMIN,
    MANAGER,
    TECHNICIAN,
    CUSTOMER
}
