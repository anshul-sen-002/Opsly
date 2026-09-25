package com.opsly.auth.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.opsly.common.exception.BadRequestException;
import com.opsly.user.entity.RefreshToken;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Regression test: the refresh cookie must not outlive the account. A deleted or
 * deactivated login used to be able to mint fresh access tokens for the whole
 * 7-day refresh-token lifetime, which resurrected the session in the browser.
 */
@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final String TOKEN = "refresh-token-1";

    @Mock RefreshTokenRepository refreshTokenRepository;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(refreshTokenRepository);
    }

    @Test
    void refreshIsRejectedForSoftDeletedLogin() {
        RefreshToken token = token(login(UserStatus.INACTIVE, true));
        when(refreshTokenRepository.findByToken(TOKEN)).thenReturn(Optional.of(token));

        assertThrows(BadRequestException.class, () -> refreshTokenService.validateRefreshToken(TOKEN));

        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void refreshIsRejectedForDeactivatedLogin() {
        RefreshToken token = token(login(UserStatus.INACTIVE, false));
        when(refreshTokenRepository.findByToken(TOKEN)).thenReturn(Optional.of(token));

        assertThrows(BadRequestException.class, () -> refreshTokenService.validateRefreshToken(TOKEN));

        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void refreshIsAllowedForActiveLogin() {
        RefreshToken token = token(login(UserStatus.ACTIVE, false));
        when(refreshTokenRepository.findByToken(TOKEN)).thenReturn(Optional.of(token));

        assertSame(token, refreshTokenService.validateRefreshToken(TOKEN));

        assertFalse(token.isRevoked());
        verify(refreshTokenRepository, never()).save(any());
    }

    private User login(UserStatus status, boolean deleted) {
        return User.builder()
                .email("customer@example.com")
                .password("x")
                .role(Role.CUSTOMER)
                .status(status)
                .deleted(deleted)
                .build();
    }

    private RefreshToken token(User user) {
        return RefreshToken.builder()
                .token(TOKEN)
                .user(user)
                .expiresAt(Instant.now().plusSeconds(3600))
                .revoked(false)
                .build();
    }
}
