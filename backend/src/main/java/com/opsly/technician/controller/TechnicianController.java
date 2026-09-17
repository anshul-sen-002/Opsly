package com.opsly.technician.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.technician.dto.TechnicianResponse;
import com.opsly.technician.service.TechnicianService;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/technicians")
@RequiredArgsConstructor
public class TechnicianController {

    private final TechnicianService technicianService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Page<TechnicianResponse>>> getAllTechnicians(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Technicians retrieved", technicianService.getAllTechnicians(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<TechnicianResponse>> getTechnician(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Technician retrieved", technicianService.getTechnicianById(id)));
    }

    /**
     * TECHNICIAN: read their own technician profile.
     *
     * GET /api/technicians/me
     *
     * The technician profile is resolved from the JWT — never from a request param,
     * so a technician can only ever read their own record.
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<TechnicianResponse>> getMyProfile(
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", technicianService.getMyProfile(caller)));
    }
}