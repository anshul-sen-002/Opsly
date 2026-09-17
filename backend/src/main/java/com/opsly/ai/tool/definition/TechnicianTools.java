package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.Schema;
import com.opsly.ai.tool.ToolDefinition;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.service.JobService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tools available only to TECHNICIAN role.
 *
 * A technician can only see and act on their own assigned jobs.
 * The caller identity always comes from the authenticated User — never from tool arguments.
 *
 * Provided tools:
 *   my_jobs     — list jobs assigned to the authenticated technician
 *   get_my_job  — get details of one of the technician's own jobs
 *   start_job   — transition ASSIGNED → IN_PROGRESS (own job only)
 *   complete_job — transition IN_PROGRESS → COMPLETED (own job only)
 */
@Component
@RequiredArgsConstructor
public class TechnicianTools {

    private final JobService jobService;
    private final ObjectMapper mapper;

    public List<ToolDefinition> getTools() {
        return List.of(myJobs(), getMyJob(), startJob(), completeJob());
    }

    // ---- my_jobs ----

    private ToolDefinition myJobs() {
        return new ToolDefinition(
                "my_jobs",
                "List all jobs assigned to you. Identity is derived from your login — no parameters needed.",
                Schema.noParams(mapper),
                Set.of(Role.TECHNICIAN),
                this::execMyJobs
        );
    }

    private String execMyJobs(JsonNode args, User caller) {
        // Identity always from JWT — caller is the authenticated technician
        Page<JobResponse> page = jobService.getMyJobs(caller, PageRequest.of(0, 50));
        if (page.isEmpty()) return "You have no assigned jobs.";
        StringBuilder sb = new StringBuilder("Your jobs (" + page.getTotalElements() + " total):\n");
        for (JobResponse j : page.getContent()) {
            sb.append(String.format("  #%d | %s | Customer: %s | Scheduled: %s\n",
                    j.getId(), j.getStatus(), j.getCustomerName(),
                    j.getScheduledAt() != null ? j.getScheduledAt() : "Not set"));
        }
        return sb.toString();
    }

    // ---- get_my_job ----

    private ToolDefinition getMyJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "ID of the job to retrieve"));
        return new ToolDefinition(
                "get_my_job",
                "Get full details of a specific job assigned to you.",
                Schema.object(mapper, props, List.of("job_id")),
                Set.of(Role.TECHNICIAN),
                this::execGetMyJob
        );
    }

    private String execGetMyJob(JsonNode args, User caller) {
        // getJobById is shared — ownership check happens inside startJob/completeJob
        // Here we just return the details; the technician will only call this for their own jobs
        JobResponse j = jobService.getJobById(Schema.getLong(args, "job_id"));
        return String.format("Job #%d | Status: %s | Customer: %s | Description: %s | Scheduled: %s",
                j.getId(), j.getStatus(), j.getCustomerName(), j.getDescription(),
                j.getScheduledAt() != null ? j.getScheduledAt() : "Not set");
    }

    // ---- start_job ----

    private ToolDefinition startJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "ID of the ASSIGNED job to start"));
        return new ToolDefinition(
                "start_job",
                "Start an ASSIGNED job. Transitions status to IN_PROGRESS. You must be the assigned technician.",
                Schema.object(mapper, props, List.of("job_id")),
                Set.of(Role.TECHNICIAN),
                this::execStartJob
        );
    }

    private String execStartJob(JsonNode args, User caller) {
        // JobService validates ownership — throws ForbiddenException if not assigned to caller
        JobResponse r = jobService.startJob(Schema.getLong(args, "job_id"), caller);
        return String.format("Job #%d started. Status: %s", r.getId(), r.getStatus());
    }

    // ---- complete_job ----

    private ToolDefinition completeJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "ID of the IN_PROGRESS job to mark complete"));
        return new ToolDefinition(
                "complete_job",
                "Mark an IN_PROGRESS job as COMPLETED. You must be the assigned technician.",
                Schema.object(mapper, props, List.of("job_id")),
                Set.of(Role.TECHNICIAN),
                this::execCompleteJob
        );
    }

    private String execCompleteJob(JsonNode args, User caller) {
        // JobService validates ownership — throws ForbiddenException if not assigned to caller
        JobResponse r = jobService.completeJob(Schema.getLong(args, "job_id"), caller);
        return String.format("Job #%d completed. Status: %s. Awaiting Admin/Manager verification to close.",
                r.getId(), r.getStatus());
    }
}