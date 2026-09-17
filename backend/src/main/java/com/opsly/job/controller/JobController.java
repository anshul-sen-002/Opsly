package com.opsly.job.controller;

import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.common.response.ApiResponse;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.job.dto.AssignTechnicianRequest;
import com.opsly.job.dto.JobRequest;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.user.entity.Role;
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
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final CustomerRepository customerRepository;

    // ADMIN/MANAGER/CUSTOMER can create a job
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CUSTOMER')")
    public ResponseEntity<ApiResponse<JobResponse>> createJob(@Valid @RequestBody JobRequest request,
            @AuthenticationPrincipal User caller) {
        // For customers, derive customerId from the authenticated user (ignore
        // client-supplied id)
        if (caller.getRole() == Role.CUSTOMER) {
            Customer customer = customerRepository.findByUser(caller)
                    .orElseThrow(() -> new ResourceNotFoundException("No customer profile linked to this account"));
            request.setCustomerId(customer.getId());
        }
        // For ADMIN/MANAGER, use the customerId supplied in the request (validation
        // ensures it exists)
        return ResponseEntity.ok(ApiResponse.success("Job created", jobService.createJob(request)));
    }

    // ADMIN/MANAGER: see all jobs, optional status filter
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getAllJobs(
            @RequestParam(required = false) JobStatus status,
            Pageable pageable) {
        Page<JobResponse> jobs = status != null
                ? jobService.getJobsByStatus(status, pageable)
                : jobService.getAllJobs(pageable);
        return ResponseEntity.ok(ApiResponse.success("Jobs retrieved", jobs));
    }

    // ADMIN/MANAGER/TECHNICIAN: get one job by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<JobResponse>> getJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Job retrieved", jobService.getJobById(id)));
    }

    // TECHNICIAN: own assigned jobs — identity from JWT, never from params
    @GetMapping("/my-jobs")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getMyJobs(
            @AuthenticationPrincipal User caller,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Jobs retrieved", jobService.getMyJobs(caller, pageable)));
    }

    /**
     * CUSTOMER: list their own service requests.
     * Customer profile is resolved from JWT — never trusted from request params.
     */
    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getMyRequests(
            @AuthenticationPrincipal User caller,
            Pageable pageable) {
        Customer customer = resolveCustomer(caller);
        return ResponseEntity.ok(ApiResponse.success("Requests retrieved",
                jobService.getJobsByCustomer(customer.getId(), pageable)));
    }

    /**
     * CUSTOMER: get a single service request — ownership enforced in service layer.
     */
    @GetMapping("/my-requests/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<JobResponse>> getMyRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        Customer customer = resolveCustomer(caller);
        return ResponseEntity.ok(ApiResponse.success("Request retrieved",
                jobService.getJobByIdForCustomer(id, customer.getId())));
    }

    // ADMIN/MANAGER: assign technician — PENDING -> ASSIGNED
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<JobResponse>> assignTechnician(
            @PathVariable Long id,
            @Valid @RequestBody AssignTechnicianRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Technician assigned", jobService.assignTechnician(id, request)));
    }

    // TECHNICIAN: start own job — ASSIGNED -> IN_PROGRESS
    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<JobResponse>> startJob(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Job started", jobService.startJob(id, caller)));
    }

    // TECHNICIAN: complete own job — IN_PROGRESS -> COMPLETED
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<JobResponse>> completeJob(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Job completed", jobService.completeJob(id, caller)));
    }

    // ADMIN/MANAGER: close job after verification — COMPLETED -> CLOSED
    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<JobResponse>> closeJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Job closed", jobService.closeJob(id)));
    }

    // Resolve Customer profile from authenticated User — throws 404 if no profile
    // linked
    private Customer resolveCustomer(User caller) {
        return customerRepository.findByUser(caller)
                .orElseThrow(() -> new ResourceNotFoundException("No customer profile linked to this account"));
    }
}
