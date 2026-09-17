package com.opsly.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * RefreshToken is stored in the database so that:
 * - Logout can properly revoke the token
 * - Only one valid refresh token exists per user (old tokens are replaced)
 * - Expired tokens can be cleaned up
 *
 * The actual token string is sent as an HttpOnly cookie to the browser.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The hashed or raw token string
    @Column(nullable = false, unique = true)
    private String token;

    // Link to the user this token belongs to
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiresAt;

    // Whether this token has been explicitly revoked (e.g., on logout)
    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;
}
