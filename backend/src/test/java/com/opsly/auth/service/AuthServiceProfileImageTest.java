package com.opsly.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import com.opsly.auth.dto.AuthResponse;
import com.opsly.auth.dto.LoginRequest;
import com.opsly.common.security.JwtUtil;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.user.entity.RefreshToken;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Regression test: the topbar account button renders the caller's real profile
 * photo. That requires the auth response to carry profileImageUrl on every
 * token issue — login, registration and refresh all go through
 * buildAuthResponse, so a missing field there leaves the shell on the
 * default gradient avatar until the user signs in again.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceProfileImageTest {

    @Mock UserRepository userRepository;
    @Mock CustomerRepository customerRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtUtil jwtUtil;
    @Mock RefreshTokenService refreshTokenService;
    @Mock ApplicationEventPublisher eventPublisher;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, customerRepository, passwordEncoder, authenticationManager,
                jwtUtil, refreshTokenService, eventPublisher);
    }

    private User userWithImage(String imageUrl) {
        User user = User.builder()
                .email("ravi@example.com")
                .password("x")
                .role(Role.TECHNICIAN)
                .status(UserStatus.ACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 7L);
        org.springframework.test.util.ReflectionTestUtils.setField(user, "profileImageUrl", imageUrl);
        return user;
    }

    private void stubToken(User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("refresh-abc");
        when(refreshTokenService.createRefreshToken(user)).thenReturn(refreshToken);
        when(jwtUtil.generateAccessToken(user)).thenReturn("access-xyz");
    }

    private LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail("ravi@example.com");
        request.setPassword("password");
        return request;
    }

    @Test
    void loginReturnsProfileImageUrl() {
        User user = userWithImage("https://res.cloudinary.com/demo/image/upload/ravi.jpg");
        when(userRepository.findByEmail("ravi@example.com")).thenReturn(Optional.of(user));
        stubToken(user);

        AuthService.AuthServiceResult result = authService.login(loginRequest());

        AuthResponse response = result.authResponse();
        assertEquals("https://res.cloudinary.com/demo/image/upload/ravi.jpg",
                response.getProfileImageUrl());
        assertEquals(7L, response.getUserId());
    }

    @Test
    void refreshReturnsProfileImageUrl() {
        User user = userWithImage("https://res.cloudinary.com/demo/image/upload/ravi-new.jpg");
        RefreshToken existing = new RefreshToken();
        existing.setUser(user);
        when(refreshTokenService.validateRefreshToken("refresh-abc")).thenReturn(existing);
        stubToken(user);

        AuthService.AuthServiceResult result = authService.refreshToken("refresh-abc");

        assertEquals("https://res.cloudinary.com/demo/image/upload/ravi-new.jpg",
                result.authResponse().getProfileImageUrl());
    }

    @Test
    void profileImageUrlIsNullWhenNoPhotoUploaded() {
        User user = userWithImage(null);
        when(userRepository.findByEmail("ravi@example.com")).thenReturn(Optional.of(user));
        stubToken(user);

        AuthService.AuthServiceResult result = authService.login(loginRequest());

        // Absent, not empty — the frontend treats "" as a present image URL
        assertNull(result.authResponse().getProfileImageUrl());
    }
}