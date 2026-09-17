package com.opsly.dashboard.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.dashboard.dto.DashboardSummaryResponse;
import com.opsly.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TECHNICIAN')")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * GET /api/dashboard/summary?days=7
     *
     * Aggregated operations overview for the dashboard home screen.
     * days accepts 7, 14 or 30 (anything else falls back to 7).
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> summary(
            @RequestParam(defaultValue = "7") int days) {

        return ResponseEntity.ok(ApiResponse.success("Dashboard summary", dashboardService.getSummary(days)));
    }
}
