package com.opsly.auth.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.user.entity.RefreshToken;
import com.opsly.user.entity.User;
import com.opsly.user.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Handles creation, validation, and revocation of refresh tokens.
 * One refresh token per user policy — old token is deleted on each new login.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    /**
     * Creates a new refresh token for the user.
     * Deletes any existing token first (one-token-per-user policy).
     */
    @Transactional
    public RefreshToken createRefreshToken(User user) {
        // Remove old refresh token before issuing new one
        refreshTokenRepository.deleteByUser(user);

        RefreshToken token = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(token);
    }

    /**
     * Validates a refresh token string.
     * Throws BadRequestException if not found, revoked, or expired.
     */
    public RefreshToken validateRefreshToken(String tokenString) {
        RefreshToken token = refreshTokenRepository.findByToken(tokenString)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (token.isRevoked()) {
            throw new BadRequestException("Refresh token has been revoked");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Refresh token has expired");
        }

        return token;
    }

    /**
     * Revokes a token on logout.
     */
    @Transactional
    public void revokeToken(String tokenString) {
        refreshTokenRepository.findByToken(tokenString).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }
}