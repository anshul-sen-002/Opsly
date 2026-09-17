package com.opsly.common.config;

import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Admin Bootstrap runs once at application startup.
 *
 * Flow:
 *   Check if any ADMIN user exists
 *     → No ADMIN found → Create ADMIN from env vars
 *     → ADMIN exists  → Do nothing
 *
 * Rules:
 * - Never hardcode credentials
 * - Never log credentials
 * - Safe to run multiple times (idempotent)
 * - Requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD env vars
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        // Idempotent: only create if no ADMIN exists
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("Admin account already exists. Skipping bootstrap.");
            return;
        }

        User admin = User.builder()
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))  // encode before saving
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();

        userRepository.save(admin);

        // Never log credentials or admin identity
        log.info("Initial admin account created successfully.");
    }
}