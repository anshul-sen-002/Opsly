package com.opsly.invoice.controller;

import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.common.response.ApiResponse;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.invoice.dto.InvoiceRequest;
import com.opsly.invoice.dto.InvoiceResponse;
import com.opsly.invoice.service.InvoiceService;
import com.opsly.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final CustomerRepository customerRepository;

    // ADMIN/MANAGER: create invoice for a CLOSED job
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(@Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Invoice created", invoiceService.createInvoice(request)));
    }

    // ADMIN/MANAGER: list all invoices
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getAllInvoices(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Invoices retrieved", invoiceService.getAllInvoices(pageable)));
    }

    // ADMIN/MANAGER: get one invoice by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Invoice retrieved", invoiceService.getInvoiceById(id)));
    }

    // ADMIN/MANAGER: issue invoice — DRAFT -> ISSUED
    @PutMapping("/{id}/issue")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> issueInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Invoice issued", invoiceService.issueInvoice(id)));
    }

    // ADMIN/MANAGER: upload or replace the invoice file (PDF/scan) on Cloudinary
    @PostMapping(value = "/{id}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> uploadFile(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success("Invoice file uploaded", invoiceService.uploadFile(id, file)));
    }

    /**
     * CUSTOMER: list only their own invoices.
     * Customer profile is resolved from JWT — never trusted from request params.
     */
    @GetMapping("/my-invoices")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getMyInvoices(
            @AuthenticationPrincipal User caller,
            Pageable pageable) {
        Customer customer = resolveCustomer(caller);
        return ResponseEntity.ok(ApiResponse.success("Invoices retrieved",
                invoiceService.getMyInvoices(customer.getId(), pageable)));
    }

    /**
     * CUSTOMER: get a single invoice — ownership enforced in service layer.
     */
    @GetMapping("/my-invoices/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getMyInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        Customer customer = resolveCustomer(caller);
        return ResponseEntity.ok(ApiResponse.success("Invoice retrieved",
                invoiceService.getMyInvoiceById(id, customer.getId())));
    }

    // Resolve Customer profile from authenticated User — throws 404 if no profile linked
    private Customer resolveCustomer(User caller) {
        return customerRepository.findByUser(caller)
                .orElseThrow(() -> new ResourceNotFoundException("No customer profile linked to this account"));
    }
}
