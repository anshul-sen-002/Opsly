package com.opsly.auth.controller;

import com.opsly.auth.dto.AuthResponse;
import com.opsly.auth.dto.CustomerRegisterRequest;
import com.opsly.auth.dto.LoginRequest;
import com.opsly.auth.service.AuthService;
import com.opsly.auth.service.AuthService.AuthServiceResult;
import com.opsly.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private final AuthService authService;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @PostMapping("/customer/register")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCustomer(
            @Valid @RequestBody CustomerRegisterRequest request,
            HttpServletResponse response) {
        AuthServiceResult result = authService.registerCustomer(request);
        setRefreshTokenCookie(response, result.refreshTokenString());
        return ResponseEntity.ok(ApiResponse.success("Registration successful", result.authResponse()));
    }

    @PostMapping("/customer/login")
    public ResponseEntity<ApiResponse<AuthResponse>> loginCustomer(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthServiceResult result = authService.login(request);
        setRefreshTokenCookie(response, result.refreshTokenString());
        return ResponseEntity.ok(ApiResponse.success("Login successful", result.authResponse()));
    }

    @PostMapping("/staff/login")
    public ResponseEntity<ApiResponse<AuthResponse>> loginStaff(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthServiceResult result = authService.login(request);
        setRefreshTokenCookie(response, result.refreshTokenString());
        return ResponseEntity.ok(ApiResponse.success("Login successful", result.authResponse()));
    }

    // Uses HttpOnly cookie for refresh token
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);
        AuthServiceResult result = authService.refreshToken(refreshToken);
        setRefreshTokenCookie(response, result.refreshTokenString());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", result.authResponse()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}