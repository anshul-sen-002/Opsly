package com.opsly.customer.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.customer.dto.CustomerRequest;
import com.opsly.customer.dto.CustomerResponse;
import com.opsly.customer.dto.GrantPortalAccessRequest;
import com.opsly.customer.service.CustomerService;
import com.opsly.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    // Admin/Manager creates a customer record (no login account)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Customer created", customerService.createCustomer(request)));
    }

    // Read-only for TECHNICIAN — the directory powers assignment context;
    // all writes stay ADMIN/MANAGER only.
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<Page<CustomerResponse>>> getAllCustomers(
            Pageable pageable,
            @RequestParam(defaultValue = "false") boolean deleted) {
        return ResponseEntity.ok(ApiResponse.success("Customers retrieved", customerService.getAllCustomers(pageable, deleted)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Customer retrieved", customerService.getCustomerById(id)));
    }

    /**
     * CUSTOMER: read their own customer profile.
     *
     * GET /api/customers/me
     *
     * The customer profile is resolved from the JWT — never from a request param,
     * so a customer can only ever read their own record.
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getMyProfile(@AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", customerService.getMyProfile(caller)));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateMyProfile(
            @AuthenticationPrincipal User caller,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated", customerService.updateMyProfile(caller, request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Customer updated", customerService.updateCustomer(id, request)));
    }

    // Soft delete — the customer can be restored later
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> deleteCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Customer deleted", customerService.deleteCustomer(id)));
    }

    // Restore a soft-deleted customer record
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> restoreCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Customer restored", customerService.restoreCustomer(id)));
    }

    /**
     * Grants portal login access to a staff-created customer (user_id = null).
     *
     * POST /api/customers/{id}/grant-access
     * Body: { "email": "...", "password": "..." }
     *
     * After this call, the customer can log in via POST /api/auth/customer/login.
     * Role is always forced to CUSTOMER by the service layer.
     */
    @PostMapping("/{id}/grant-access")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> grantPortalAccess(
            @PathVariable Long id,
            @Valid @RequestBody GrantPortalAccessRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Portal access granted", customerService.grantPortalAccess(id, request)));
    }
}