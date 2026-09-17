package com.opsly.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Auth response sent after successful login or token refresh.
 * - accessToken: short-lived JWT (sent in response body)
 * - refreshToken: NOT included here — sent as HttpOnly cookie by the controller
 * - role: for frontend UI routing decisions only (not a security boundary)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String role;
    private Long userId;
    private String email;
}