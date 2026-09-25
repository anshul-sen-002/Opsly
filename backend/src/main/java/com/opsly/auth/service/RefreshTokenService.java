package com.opsly.auth.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.user.entity.RefreshToken;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
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
     * Throws BadRequestException if not found, revoked, expired, or if the
     * account behind it is no longer allowed (deleted or INACTIVE).
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

        // An account is allowed only when it is ACTIVE and NOT deleted.
        // Without this check a deleted or deactivated account could keep minting
        // fresh access tokens for the whole refresh-token lifetime (7 days).
        User user = token.getUser();
        if (user.isDeleted() || user.getStatus() != UserStatus.ACTIVE) {
            revokeToken(tokenString);
            throw new BadRequestException("This account is no longer active");
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