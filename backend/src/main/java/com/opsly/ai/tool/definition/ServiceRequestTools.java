package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.Schema;
import com.opsly.ai.tool.ToolDefinition;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.search.service.ServiceRequestSearchService;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.service.TechnicianService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The four service-request tools for the Opsly AI assistant.
 * "Service Request" and "Job" are the same entity: these tools reuse
 * JobService (PostgreSQL = source of truth) and ServiceRequestSearchService
 * (OpenSearch for keyword search only, PostgreSQL fallback).
 * Caller identity always comes from the authenticated User - never from args.
 */
@Component
@RequiredArgsConstructor
public class ServiceRequestTools {

    private static final Set<Role> EVERYONE =
            Set.of(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CUSTOMER);

    private final JobService jobService;
    private final TechnicianService technicianService;
    private final CustomerRepository customerRepository;
    private final ServiceRequestSearchService searchService;
    private final ObjectMapper mapper;

    public List<ToolDefinition> getTools() {
        return List.of(
                getMyServiceRequests(),
                getServiceRequestDetails(),
                getTodaySchedule(),
                searchServiceRequests());
    }

    // ---- get_my_service_requests ----

    private ToolDefinition getMyServiceRequests() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("status", Schema.string(mapper,
                "Filter by status e.g. PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED (optional)"));
        return new ToolDefinition(
                "get_my_service_requests",
                "List service requests visible to you. ADMIN/MANAGER see all; "
                        + "TECHNICIAN sees only assigned requests; CUSTOMER sees only their own.",
                Schema.object(mapper, props, List.of()),
                EVERYONE,
                this::execMyServiceRequests);
    }

    private String execMyServiceRequests(JsonNode args, User caller) {
        String status = Schema.getStringOrNull(args, "status");
        return switch (caller.getRole()) {
            case ADMIN, MANAGER -> staffList(status);
            case TECHNICIAN -> technicianList(caller, status);
            case CUSTOMER -> customerList(caller, status);
        };
    }

    private String staffList(String status) {
        Page<JobResponse> page = (status == null || status.isBlank())
                ? jobService.getAllJobs(PageRequest.of(0, 50))
                : jobService.getJobsByStatus(parseStatus(status), PageRequest.of(0, 50));
        return formatList("Service requests", page);
    }

    private String technicianList(User caller, String status) {
        Page<JobResponse> page = jobService.getMyJobs(caller, PageRequest.of(0, 50));
        if (status != null && !status.isBlank()) {
            List<JobResponse> filtered = page.getContent().stream()
                    .filter(j -> j.getStatus().name().equalsIgnoreCase(status.trim())).toList();
            return formatList("Your assigned service requests", filtered, filtered.size());
        }
        return formatList("Your assigned service requests", page);
    }

    private String customerList(User caller, String status) {
        Long customerId = requireCustomerId(caller);
        Page<JobResponse> page = jobService.getJobsByCustomer(customerId, PageRequest.of(0, 50));
        if (status != null && !status.isBlank()) {
            List<JobResponse> filtered = page.getContent().stream()
                    .filter(j -> j.getStatus().name().equalsIgnoreCase(status.trim())).toList();
            return formatList("Your service requests", filtered, filtered.size());
        }
        return formatList("Your service requests", page);
    }

    // ---- get_service_request_details ----

    private ToolDefinition getServiceRequestDetails() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("request_id", Schema.integer(mapper, "ID of the service request"));
        return new ToolDefinition(
                "get_service_request_details",
                "Get full details of one service request. TECHNICIAN only for assigned "
                        + "requests; CUSTOMER only for their own requests.",
                Schema.object(mapper, props, List.of("request_id")),
                EVERYONE,
                this::execServiceRequestDetails);
    }

    private String execServiceRequestDetails(JsonNode args, User caller) {
        long requestId = Schema.getLong(args, "request_id");
        JobResponse j = switch (caller.getRole()) {
            case ADMIN, MANAGER -> jobService.getJobById(requestId);
            case TECHNICIAN -> {
                Technician tech = technicianService.findByUser(caller);
                JobResponse own = jobService.getJobById(requestId);
                if (own.getTechnicianId() == null || !own.getTechnicianId().equals(tech.getId())) {
                    yield null;
                }
                yield own;
            }
            case CUSTOMER ->
                    jobService.getJobByIdForCustomer(requestId, requireCustomerId(caller));
        };
        if (j == null) return "Error: You do not have access to this service request.";
        return formatDetails(j);
    }

    // ---- get_today_schedule ----

    private ToolDefinition getTodaySchedule() {
        return new ToolDefinition(
                "get_today_schedule",
                "List service requests scheduled for today visible to you. TECHNICIAN sees only "
                        + "their assigned ones; CUSTOMER sees only their own.",
                Schema.noParams(mapper),
                EVERYONE,
                this::execTodaySchedule);
    }

    private String execTodaySchedule(JsonNode args, User caller) {
        LocalDate today = LocalDate.now();
        List<JobResponse> visible = switch (caller.getRole()) {
            case ADMIN, MANAGER -> jobService.getAllJobs(PageRequest.of(0, 200)).getContent();
            case TECHNICIAN -> jobService.getMyJobs(caller, PageRequest.of(0, 200)).getContent();
            case CUSTOMER -> jobService
                    .getJobsByCustomer(requireCustomerId(caller), PageRequest.of(0, 200)).getContent();
        };
        List<JobResponse> todays = visible.stream()
                .filter(j -> j.getScheduledAt() != null
                        && j.getScheduledAt().atZone(ZoneId.systemDefault()).toLocalDate().equals(today))
                .toList();
        if (todays.isEmpty()) return "No service requests scheduled for today.";
        return formatList("Today's schedule (" + today + ")", todays, todays.size());
    }

    // ---- search_service_requests ----

    private ToolDefinition searchServiceRequests() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("query", Schema.string(mapper,
                "Keyword to search across title, description, customer, category, status and priority"));
        props.put("status", Schema.string(mapper, "Optional status filter e.g. PENDING, ASSIGNED"));
        return new ToolDefinition(
                "search_service_requests",
                "Keyword search over service requests (OpenSearch; PostgreSQL fallback). "
                        + "Results are always scoped to what you may see: TECHNICIAN only assigned, "
                        + "CUSTOMER only their own.",
                Schema.object(mapper, props, List.of("query")),
                EVERYONE,
                this::execSearchServiceRequests);
    }

    private String execSearchServiceRequests(JsonNode args, User caller) {
        String query = Schema.getString(args, "query");
        String status = Schema.getStringOrNull(args, "status");
        List<JobResponse> hits = searchService.search(query, 20);
        List<JobResponse> scoped = hits.stream()
                .filter(j -> isVisibleTo(j, caller))
                .filter(j -> status == null || status.isBlank()
                        || j.getStatus().name().equalsIgnoreCase(status.trim()))
                .toList();
        if (scoped.isEmpty()) return "No matching service requests found.";
        return formatList("Search results for \"" + query + "\"", scoped, scoped.size());
    }

    // ---- helpers (identity always from JWT caller) ----

    private boolean isVisibleTo(JobResponse j, User caller) {
        return switch (caller.getRole()) {
            case ADMIN, MANAGER -> true;
            case TECHNICIAN -> {
                try {
                    yield technicianService.findByUser(caller).getId().equals(j.getTechnicianId());
                } catch (Exception e) {
                    yield false;
                }
            }
            case CUSTOMER -> {
                try {
                    yield requireCustomerId(caller).equals(j.getCustomerId());
                } catch (Exception e) {
                    yield false;
                }
            }
        };
    }

    private Long requireCustomerId(User caller) {
        return customerRepository.findByUserAndDeletedFalse(caller)
                .filter(c -> caller.isEnabled())
                .orElseThrow(() -> new IllegalStateException("No active customer profile linked to your account."))
                .getId();
    }

    private JobStatus parseStatus(String status) {
        try {
            return JobStatus.valueOf(status.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Unknown status [" + status + "].");
        }
    }

    private String formatList(String title, Page<JobResponse> page) {
        if (page.isEmpty()) return title + ": none found.";
        return formatList(title, page.getContent(), (int) page.getTotalElements());
    }

    private String formatList(String title, List<JobResponse> jobs, int total) {
        StringBuilder sb = new StringBuilder(title + " (" + total + " total):\n");
        for (JobResponse j : jobs) {
            sb.append(String.format("  #%d | %s | Customer: %s | Technician: %s | Scheduled: %s | %s\n",
                    j.getId(), j.getStatus(), nvl(j.getCustomerName()),
                    j.getTechnicianName() != null ? j.getTechnicianName() : "Not assigned",
                    j.getScheduledAt() != null ? j.getScheduledAt() : "Not set",
                    abbrev(j.getDescription())));
        }
        return sb.toString();
    }

    private String formatDetails(JobResponse j) {
        return String.format(
                "Service request #%d | Status: %s | Customer: %s | Technician: %s | Description: %s | Scheduled: %s | Created: %s",
                j.getId(), j.getStatus(), nvl(j.getCustomerName()),
                j.getTechnicianName() != null ? j.getTechnicianName() : "Not assigned",
                nvl(j.getDescription()),
                j.getScheduledAt() != null ? j.getScheduledAt() : "Not set",
                j.getCreatedAt() != null ? j.getCreatedAt() : "N/A");
    }

    private String nvl(String v) {
        return v != null ? v : "N/A";
    }

    private String abbrev(String v) {
        if (v == null) return "N/A";
        return v.length() > 80 ? v.substring(0, 80) + "..." : v;
    }
}

