package com.opsly.customer.entity;

import com.opsly.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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

    private LocalDateTime deletedAt;

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
