package com.opsly.search.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.job.dto.JobResponse;
import com.opsly.search.service.ServiceRequestSearchService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Minimum demo surface for the OpenSearch integration.
 * PostgreSQL stays the source of truth; both endpoints return live Job rows.
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ServiceRequestSearchController {

    private final OpenSearchClient openSearchClient;
    private final ServiceRequestSearchService searchService;

    @Value("${app.opensearch.enabled:false}")
    private boolean enabled;

    /** GET /api/search/health — proves whether OpenSearch is actually reachable. */
    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        if (!enabled) {
            return ApiResponse.success("OK",
                    Map.of("enabled", false, "status", "disabled (PostgreSQL fallback active)"));
        }
        try {
            var info = openSearchClient.info();
            return ApiResponse.success("OK", Map.of(
                    "enabled", true, "status", "up",
                    "cluster", info.clusterName(), "version", info.version().number()));
        } catch (Exception e) {
            return ApiResponse.success("OK",
                    Map.of("enabled", true, "status", "down (PostgreSQL fallback active)",
                            "error", e.toString()));
        }
    }

    /** GET /api/search/service-requests?q=ac&status=PENDING — JWT-protected demo search. */
    @GetMapping("/service-requests")
    public ApiResponse<Page<JobResponse>> search(
            @RequestParam("q") @NotBlank String query,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success("OK", searchService.searchPaged(query, pageable));
    }
}
