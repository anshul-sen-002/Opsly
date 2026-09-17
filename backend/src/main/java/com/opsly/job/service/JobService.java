package com.opsly.job.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ForbiddenException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.service.CustomerService;
import com.opsly.job.dto.AssignTechnicianRequest;
import com.opsly.job.dto.JobRequest;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.Job;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.repository.JobRepository;
import com.opsly.notification.event.NotificationEvents;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.service.TechnicianService;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CustomerService customerService;
    private final TechnicianService technicianService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public JobResponse createJob(JobRequest request) {
        Customer customer = customerService.findById(request.getCustomerId());
        Job job = Job.builder()
                .customer(customer)
                .description(request.getDescription())
                .scheduledAt(request.getScheduledAt())
                .status(JobStatus.PENDING)
                .build();
        Job saved = jobRepository.save(job);
        eventPublisher.publishEvent(new NotificationEvents.JobCreatedEvent(
                saved.getId(),
                customer.getUser() != null ? customer.getUser().getId() : null,
                customer.getId(),
                customer.getName()
        ));
        return toResponse(saved);
    }

    public Page<JobResponse> getAllJobs(Pageable pageable) {
        return jobRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<JobResponse> getJobsByStatus(JobStatus status, Pageable pageable) {
        return jobRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public JobResponse getJobById(Long id) {
        return toResponse(findById(id));
    }

    /** Technician: own jobs only — identity derived from JWT. */
    public Page<JobResponse> getMyJobs(User authenticatedUser, Pageable pageable) {
        Technician technician = technicianService.findByUser(authenticatedUser);
        return jobRepository.findByTechnician(technician, pageable).map(this::toResponse);
    }

    /** Customer: own jobs only — customerId is derived from the customer profile, not from client args. */
    public Page<JobResponse> getJobsByCustomer(Long customerId, Pageable pageable) {
        return jobRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    /**
     * Customer views a single job — ownership check enforced.
     * Throws ForbiddenException if the job does not belong to this customer.
     */
    public JobResponse getJobByIdForCustomer(Long jobId, Long customerId) {
        Job job = findById(jobId);
        if (!job.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("You do not have access to this job");
        }
        return toResponse(job);
    }

    /** Admin/Manager assigns a technician: PENDING → ASSIGNED. */
    @Transactional
    public JobResponse assignTechnician(Long jobId, AssignTechnicianRequest request) {
        Job job = findById(jobId);
        if (job.getStatus() != JobStatus.PENDING) {
            throw new BadRequestException("Job can only be assigned when in PENDING status");
        }
        Technician technician = technicianService.findById(request.getTechnicianId());
        job.setTechnician(technician);
        job.setStatus(JobStatus.ASSIGNED);
        Job saved = jobRepository.save(job);

        // Notify the assigned technician's account (after commit)
        if (technician.getUser() != null) {
            eventPublisher.publishEvent(new NotificationEvents.JobAssignedEvent(saved.getId(), technician.getUser().getId()));
        }
        return toResponse(saved);
    }

    /** Technician starts job: ASSIGNED → IN_PROGRESS. Ownership enforced. */
    @Transactional
    public JobResponse startJob(Long jobId, User authenticatedUser) {
        Job job = findById(jobId);
        Technician technician = technicianService.findByUser(authenticatedUser);
        validateOwnership(job, technician);
        if (job.getStatus() != JobStatus.ASSIGNED) {
            throw new BadRequestException("Job must be in ASSIGNED status to start");
        }
        job.setStatus(JobStatus.IN_PROGRESS);
        Job saved = jobRepository.save(job);
        publishStatusEvent(saved);
        return toResponse(saved);
    }

    /** Technician completes job: IN_PROGRESS → COMPLETED. Ownership enforced. */
    @Transactional
    public JobResponse completeJob(Long jobId, User authenticatedUser) {
        Job job = findById(jobId);
        Technician technician = technicianService.findByUser(authenticatedUser);
        validateOwnership(job, technician);
        if (job.getStatus() != JobStatus.IN_PROGRESS) {
            throw new BadRequestException("Job must be in IN_PROGRESS status to complete");
        }
        job.setStatus(JobStatus.COMPLETED);
        Job saved = jobRepository.save(job);
        publishStatusEvent(saved);
        return toResponse(saved);
    }

    /** Admin/Manager closes job: COMPLETED → CLOSED. */
    @Transactional
    public JobResponse closeJob(Long jobId) {
        Job job = findById(jobId);
        if (job.getStatus() != JobStatus.COMPLETED) {
            throw new BadRequestException("Job must be in COMPLETED status to close");
        }
        job.setStatus(JobStatus.CLOSED);
        Job saved = jobRepository.save(job);
        publishStatusEvent(saved);
        return toResponse(saved);
    }

    /** Staff roles + the customer's linked account (if any) + assigned technician hear about job status changes. */
    private void publishStatusEvent(Job job) {
        Long customerUserId = job.getCustomer().getUser() != null ? job.getCustomer().getUser().getId() : null;
        Long technicianUserId = job.getTechnician() != null && job.getTechnician().getUser() != null
                ? job.getTechnician().getUser().getId()
                : null;
        eventPublisher.publishEvent(new NotificationEvents.JobStatusEvent(
                job.getId(), customerUserId, technicianUserId, job.getStatus()));
    }

    public Job findById(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", id));
    }

    private void validateOwnership(Job job, Technician technician) {
        if (job.getTechnician() == null || !job.getTechnician().getId().equals(technician.getId())) {
            throw new ForbiddenException("You are not assigned to this job");
        }
    }

    private JobResponse toResponse(Job job) {
        JobResponse response = new JobResponse();
        response.setId(job.getId());
        response.setCustomerId(job.getCustomer().getId());
        response.setCustomerName(job.getCustomer().getName());
        response.setStatus(job.getStatus());
        response.setDescription(job.getDescription());
        response.setScheduledAt(job.getScheduledAt());
        response.setCreatedAt(job.getCreatedAt());
        response.setUpdatedAt(job.getUpdatedAt());
        if (job.getTechnician() != null) {
            response.setTechnicianId(job.getTechnician().getId());
            response.setTechnicianName(job.getTechnician().getName());
        }
        return response;
    }
}