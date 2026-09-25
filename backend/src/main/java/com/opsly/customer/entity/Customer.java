package com.opsly.customer.entity;

import com.opsly.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Customer represents the business/person receiving services.
 * A Customer does NOT require a login account (user_id can be null).
 * When a Customer self-registers or is given portal access, user_id is linked.
 */
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String companyName;

    @Column(nullable = false)
    private String phone;

    private String email;

    private String address;

    private String city;

    /**
     * Optional link to a User account.
     * null  = Customer has no login
     * set   = Customer can log in via this User account
     */
    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    // Soft delete — keeps the record for reporting; deleted rows are restorable
    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    private Instant deletedAt;

    /**
     * Marker: did {@code deleteCustomer} flip the linked login from ACTIVE to
     * INACTIVE? Restore only re-activates when this is true — a login that was
     * already INACTIVE before the delete stays INACTIVE after restore.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean loginDisabledByDelete = false;
    @Column(nullable = false, updatable = false, columnDefinition = "timestamp with time zone")
    private Instant createdAt;
    @Column(nullable = false, columnDefinition = "timestamp with time zone")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
