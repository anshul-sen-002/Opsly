package com.opsly.payment.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.customer.service.CustomerService;
import com.opsly.user.entity.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.opsly.payment.dto.PaymentRequest;
import com.opsly.payment.dto.PaymentResponse;
import com.opsly.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final CustomerService customerService;

    @GetMapping("/my-payments")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal User caller, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved",
                paymentService.getCustomerPayments(customerService.getMyProfile(caller).getId(), pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PaymentResponse>> updatePayment(
            @PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment updated", paymentService.updatePayment(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.ok(ApiResponse.success("Payment deleted", null));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(@Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment recorded", paymentService.recordPayment(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Payment retrieved", paymentService.getPaymentById(id)));
    }

    // ADMIN/MANAGER: list all payments (paginated)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getAllPayments(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved", paymentService.getAllPayments(pageable)));
    }

    // Get all payments for a specific invoice
    @GetMapping("/invoice/{invoiceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getPaymentsByInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success("Payments retrieved", paymentService.getPaymentsByInvoice(invoiceId)));
    }
}