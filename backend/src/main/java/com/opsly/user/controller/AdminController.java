package com.opsly.user.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.user.dto.CreateStaffRequest;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.dto.UpdateStaffRequest;
import com.opsly.user.entity.Role;
import com.opsly.user.service.AdminService;
import com.opsly.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Admin controller for staff account management.
 * Most endpoints require ADMIN role.
 * Staff update and status change can be done by both ADMIN and MANAGER
 * (MANAGER restricted to TECHNICIAN targets — enforced in AdminService).
 */
@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Staff account created", adminService.createStaff(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<Page<StaffResponse>>> getAllStaff(
            Pageable pageable,
            @RequestParam(defaultValue = "false") boolean deleted) {
        return ResponseEntity.ok(ApiResponse.success("Staff retrieved", adminService.getAllStaff(pageable, deleted)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<StaffResponse>> getStaff(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Staff retrieved", adminService.getStaffById(id)));
    }

    /**
     * Update a staff account.
     * ADMIN can update any staff. MANAGER can only update TECHNICIAN accounts.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffRequest request,
            @AuthenticationPrincipal User caller) {
        Role callerRole = caller.getRole();
        return ResponseEntity.ok(ApiResponse.success("Staff updated", adminService.updateStaff(id, request, callerRole)));
    }

    /**
     * Activate a staff account. ADMIN: any staff account;
     * MANAGER: TECHNICIAN targets only (enforced in the service).
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<StaffResponse>> activateStaff(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Staff activated", adminService.activateStaff(id, caller.getRole())));
    }

    /**
     * Deactivate a staff account. ADMIN: any staff account;
     * MANAGER: TECHNICIAN targets only (enforced in the service).
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<StaffResponse>> deactivateStaff(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Staff deactivated", adminService.deactivateStaff(id, caller.getRole())));
    }

    // Soft delete — the account can be restored later
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StaffResponse>> deleteStaff(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(ApiResponse.success("Staff deleted", adminService.deleteStaff(id, currentUserId)));
    }

    // Restore a soft-deleted account
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StaffResponse>> restoreStaff(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Staff restored", adminService.restoreStaff(id)));
    }
}
