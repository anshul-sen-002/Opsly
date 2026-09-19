package com.opsly.search.service;

import com.opsly.job.dto.JobResponse;
import com.opsly.job.service.JobService;
import com.opsly.search.document.ServiceRequestDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.query_dsl.Query;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Search over service requests.
 *
 * <p>PostgreSQL is the source of truth — every search re-validates the hit against
 * the current {@link JobResponse} so stale index rows can never leak data the
 * caller may not see. When OpenSearch is unreachable or disabled, search falls
 * back to a PostgreSQL keyword scan so the AI tool keeps working locally.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceRequestSearchService {

    public static final String INDEX = "service-requests";

    private final OpenSearchClient openSearchClient;
    private final JobService jobService;

    @Value("${app.opensearch.enabled:false}")
    private boolean enabled;

    /**
     * Keyword search across title, description, customer, category, status, priority.
     * Returns fresh {@link JobResponse} rows from PostgreSQL for the matching ids.
     */
    public List<JobResponse> search(String query, int size) {
        if (enabled) {
            try {
                return searchViaOpenSearch(query, size);
            } catch (Exception e) {
                log.warn("OpenSearch search failed, falling back to PostgreSQL: {}", e.toString());
            }
        }
        return searchViaPostgres(query, size);
    }

    private List<JobResponse> searchViaOpenSearch(String query, int size) throws IOException {
        Query q = Query.of(b -> b.multiMatch(m -> m
                .query(query)
                .fields("title^3", "description^2", "customerName^2",
                        "technicianName", "category^2", "status", "priority")));

        SearchRequest request = SearchRequest.of(s -> s
                .index(INDEX)
                .size(Math.max(1, Math.min(size, 50)))
                .query(q));

        var response = openSearchClient.search(request, ServiceRequestDocument.class);
        List<JobResponse> out = new ArrayList<>();
        for (var hit : response.hits().hits()) {
            ServiceRequestDocument doc = hit.source();
            if (doc == null || doc.getRequestId() == null) continue;
            try {
                out.add(jobService.getJobById(doc.getRequestId()));
            } catch (Exception e) {
                log.debug("Skipping stale index hit requestId={}: {}", doc.getRequestId(), e.toString());
            }
        }
        return out;
    }

    /** Local/PostgreSQL fallback: case-insensitive keyword scan of live Job rows. */
    List<JobResponse> searchViaPostgres(String query, int size) {
        String q = query == null ? "" : query.trim().toLowerCase();
        Page<JobResponse> page = jobService.getAllJobs(Pageable.ofSize(Math.max(50, size * 5)));
        List<JobResponse> out = new ArrayList<>();
        for (JobResponse j : page.getContent()) {
            if (out.size() >= size) break;
            if (q.isEmpty() || matches(j, q)) out.add(j);
        }
        return out;
    }

    private boolean matches(JobResponse j, String q) {
        return contains(j.getDescription(), q)
                || contains(j.getCustomerName(), q)
                || contains(j.getTechnicianName(), q)
                || (j.getStatus() != null && j.getStatus().name().toLowerCase().contains(q))
                || String.valueOf(j.getId()).equals(q)
                || ("service request #" + j.getId()).contains(q);
    }

    private boolean contains(String value, String q) {
        return value != null && value.toLowerCase().contains(q);
    }

    /** Index (or re-index) one job — best effort, never fails the calling flow. */
    public void indexJob(Long jobId) {
        if (!enabled) return;
        try {
            JobResponse job = jobService.getJobById(jobId);
            openSearchClient.index(i -> i
                    .index(INDEX)
                    .id(String.valueOf(jobId))
                    .document(ServiceRequestDocument.from(job)));
        } catch (Exception e) {
            log.debug("OpenSearch index skipped for job {}: {}", jobId, e.toString());
        }
    }

    /** Paged view used by the optional demo endpoint. */
    public Page<JobResponse> searchPaged(String query, Pageable pageable) {
        List<JobResponse> hits = search(query, pageable.getPageSize());
        return new PageImpl<>(hits, pageable, hits.size());
    }
}
