package com.opsly.common.controller;

import com.opsly.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Simple liveness probe.
 *
 * GET /api/health  →  { "success": true, "message": "Ok", "data": "Ok" }
 *
 * Public endpoint (no authentication required).  Used by UptimeRobot
 * and Render health checks to keep the backend awake / verify availability.
 * Both `/api/health` and `/api/health/` are mapped.
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    @GetMapping({"", "/"})
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.success("Ok", "Ok"));
    }
}
