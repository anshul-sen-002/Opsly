package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.Schema;
import com.opsly.ai.tool.ToolDefinition;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.job.dto.JobRequest;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.service.JobService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tools available only to CUSTOMER role.
 *
 * A customer can only:
 *   - Create a service request (job) for themselves
 *   - View their own jobs
 *   - Get details of a specific job (ownership enforced)
 *
 * Customers cannot view other customers' data or any staff data.
 * The customer profile is always derived from the authenticated User — never from arguments.
 */
@Component
@RequiredArgsConstructor
public class CustomerTools {

    private final JobService jobService;
    private final CustomerRepository customerRepository;
    private final ObjectMapper mapper;

    public List<ToolDefinition> getTools() {
        return List.of(createJobRequest(), myJobRequests(), getMyJob());
    }

    // ---- create_job_request ----

    private ToolDefinition createJobRequest() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("description",  Schema.string(mapper, "Description of the service you need"));
        props.put("scheduled_at", Schema.string(mapper, "Preferred date/time ISO format e.g. 2024-12-25T10:00:00 (optional)"));
        return new ToolDefinition(
                "create_job_request",
                "Create a service request for yourself. The job is created in PENDING status and will be assigned to a technician by staff.",
                Schema.object(mapper, props, List.of("description")),
                Set.of(Role.CUSTOMER),
                this::execCreateJobRequest
        );
    }

    private String execCreateJobRequest(JsonNode args, User caller) {
        // Derive the Customer record from the authenticated user — never trust a client-supplied ID
        Customer customer = customerRepository.findByUser(caller)
                .orElseThrow(() -> new IllegalStateException("No customer profile linked to your account. Contact support."));

        JobRequest req = new JobRequest();
        req.setCustomerId(customer.getId());
        req.setDescription(Schema.getString(args, "description"));

        String scheduledStr = Schema.getStringOrNull(args, "scheduled_at");
        if (scheduledStr != null) req.setScheduledAt(LocalDateTime.parse(scheduledStr));

        JobResponse r = jobService.createJob(req);
        return String.format(
                "Service request created — Job ID: %d | Status: %s | We will assign a technician shortly.",
                r.getId(), r.getStatus());
    }

    // ---- my_job_requests ----

    private ToolDefinition myJobRequests() {
        return new ToolDefinition(
                "my_job_requests",
                "List all your service requests and their current status.",
                Schema.noParams(mapper),
                Set.of(Role.CUSTOMER),
                this::execMyJobRequests
        );
    }

    private String execMyJobRequests(JsonNode args, User caller) {
        // Customers do not have a my-jobs endpoint in JobService — we use a customer-scoped query
        Customer customer = customerRepository.findByUser(caller)
                .orElseThrow(() -> new IllegalStateException("No customer profile linked to your account."));

        Page<JobResponse> page = jobService.getJobsByCustomer(customer.getId(), PageRequest.of(0, 50));
        if (page.isEmpty()) return "You have no service requests yet.";

        StringBuilder sb = new StringBuilder("Your service requests (" + page.getTotalElements() + " total):\n");
        for (JobResponse j : page.getContent()) {
            sb.append(String.format("  #%d | Status: %s | Technician: %s | Scheduled: %s\n",
                    j.getId(), j.getStatus(),
                    j.getTechnicianName() != null ? j.getTechnicianName() : "Not assigned yet",
                    j.getScheduledAt() != null ? j.getScheduledAt() : "Not set"));
        }
        return sb.toString();
    }

    // ---- get_my_job ----

    private ToolDefinition getMyJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "ID of your service request"));
        return new ToolDefinition(
                "get_my_job_details",
                "Get details of one of your service requests.",
                Schema.object(mapper, props, List.of("job_id")),
                Set.of(Role.CUSTOMER),
                this::execGetMyJob
        );
    }

    private String execGetMyJob(JsonNode args, User caller) {
        Customer customer = customerRepository.findByUser(caller)
                .orElseThrow(() -> new IllegalStateException("No customer profile linked to your account."));

        JobResponse j = jobService.getJobById(Schema.getLong(args, "job_id"));

        // Ownership check — customer can only view their own jobs
        if (!j.getCustomerId().equals(customer.getId())) {
            return "Error: You do not have access to this service request.";
        }

        return String.format("Job #%d | Status: %s | Technician: %s | Description: %s | Scheduled: %s",
                j.getId(), j.getStatus(),
                j.getTechnicianName() != null ? j.getTechnicianName() : "Not assigned yet",
                j.getDescription(),
                j.getScheduledAt() != null ? j.getScheduledAt() : "Not set");
    }
}