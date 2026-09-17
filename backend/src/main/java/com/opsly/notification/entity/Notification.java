package com.opsly.notification.entity;

import com.opsly.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A persistent, per-user notification (e.g. "job assigned", "invoice issued").
 * Created by NotificationListener AFTER the business transaction commits.
 */
@Entity
@Table(
        name = "notifications",
        indexes = @Index(name = "idx_notifications_user_read", columnList = "user_id, is_read")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Recipient — always the authenticated user, never client-supplied
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 500)
    private String message;

    // Frontend route to open when the notification is clicked
    @Column(length = 200)
    private String link;

    // "read" is a reserved-ish word — stored as is_read
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}