package com.opsly.user.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.dto.UpdateMyProfileRequest;
import com.opsly.user.entity.User;
import com.opsly.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoints for the currently authenticated user.
 * Identity always comes from the JWT principal — never from client input.
 */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * GET /api/users/me — the caller's own profile, identity from the JWT.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<StaffResponse>> getMyProfile(
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success(
                "Profile retrieved", userProfileService.getMyProfile(caller)));
    }

    // Upload or replace the caller's profile image
    @PostMapping(value = "/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<StaffResponse>> updateProfileImage(
            @AuthenticationPrincipal User caller,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                "Profile image updated", userProfileService.updateProfileImage(caller, file)));
    }

    /**
     * Update the caller's own profile — name, phone and (for technicians)
     * specialization. Identity always comes from the JWT principal, so a
     * user can never edit anyone else's account. Email, role and status are
     * not editable here — those stay under ADMIN/MANAGER control.
     */
    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<StaffResponse>> updateMyProfile(
            @AuthenticationPrincipal User caller,
            @Valid @RequestBody UpdateMyProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Profile updated", userProfileService.updateMyProfile(caller, request)));
    }
}
