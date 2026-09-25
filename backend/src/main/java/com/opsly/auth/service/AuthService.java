package com.opsly.auth.service;

import com.opsly.auth.dto.AuthResponse;
import com.opsly.auth.dto.CustomerRegisterRequest;
import com.opsly.auth.dto.LoginRequest;
import com.opsly.common.exception.ConflictException;
import com.opsly.common.security.JwtUtil;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.notification.event.NotificationEvents;
import com.opsly.user.entity.RefreshToken;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final ApplicationEventPublisher eventPublisher;

    // Public customer self-registration - role always forced to CUSTOMER
    @Transactional
    public AuthServiceResult registerCustomer(CustomerRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        Customer customer = Customer.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .user(user)
                .build();
        customerRepository.save(customer);

        // Notify admins/managers (after commit)
        eventPublisher.publishEvent(new NotificationEvents.CustomerRegisteredEvent(customer.getName(), customer.getEmail()));

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        String accessToken = jwtUtil.generateAccessToken(user);
        return new AuthServiceResult(buildAuthResponse(user, accessToken), refreshToken.getToken());
    }

    // Login for both staff and customers - same infrastructure
    @Transactional
    public AuthServiceResult login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        String accessToken = jwtUtil.generateAccessToken(user);
        return new AuthServiceResult(buildAuthResponse(user, accessToken), refreshToken.getToken());
    }

    // Refresh access token - rotates refresh token on use
    public AuthServiceResult refreshToken(String refreshTokenString) {
        RefreshToken refreshToken = refreshTokenService.validateRefreshToken(refreshTokenString);
        User user = refreshToken.getUser();

        refreshTokenService.revokeToken(refreshTokenString);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);
        String accessToken = jwtUtil.generateAccessToken(user);
        return new AuthServiceResult(buildAuthResponse(user, accessToken), newRefreshToken.getToken());
    }

    // Logout - revoke the refresh token
    public void logout(String refreshTokenString) {
        refreshTokenService.revokeToken(refreshTokenString);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .role(user.getRole().name())
                .userId(user.getId())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }

    // Carries both response body and refresh token string for the controller to set as cookie
    public record AuthServiceResult(AuthResponse authResponse, String refreshTokenString) {}
}