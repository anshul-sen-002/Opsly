package com.opsly.search.service;

import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * OpenSearch itself is not required for these tests: when the client throws,
 * search degrades to the PostgreSQL fallback using live Job rows.
 */
@ExtendWith(MockitoExtension.class)
class ServiceRequestSearchServiceTest {

    @Mock OpenSearchClient openSearchClient;
    @Mock JobService jobService;

    private ServiceRequestSearchService service() {
        ServiceRequestSearchService s =
                new ServiceRequestSearchService(openSearchClient, jobService);
        setField(s, "enabled", true);
        return s;
    }

    private void setField(Object target, String name, Object value) {
        try {
            var f = ServiceRequestSearchService.class.getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private JobResponse job(long id, String desc, String customer, String status) {
        JobResponse j = new JobResponse();
        j.setId(id);
        j.setDescription(desc);
        j.setCustomerName(customer);
        j.setCustomerId(id * 10);
        j.setStatus(JobStatus.valueOf(status));
        j.setScheduledAt(Instant.now());
        return j;
    }

    @Test
    void fallsBackToPostgresWhenOpenSearchIsDown() throws Exception {
        when(openSearchClient.search(any(org.opensearch.client.opensearch.core.SearchRequest.class),
                any(Class.class))).thenThrow(new java.net.ConnectException("refused"));
        when(jobService.getAllJobs(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(
                job(1, "Fix leaking AC compressor", "Acme Corp", "PENDING"),
                job(2, "Paint office walls", "Beta LLC", "ASSIGNED"))));

        List<JobResponse> out = service().search("ac", 10);

        assertEquals(1, out.size());
        assertEquals(1L, out.get(0).getId());
    }

    @Test
    void fallsBackToPostgresWhenDisabled() {
        ServiceRequestSearchService s =
                new ServiceRequestSearchService(openSearchClient, jobService);
        setField(s, "enabled", false);
        when(jobService.getAllJobs(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(job(5, "Generator service", "Acme Corp", "PENDING"))));

        List<JobResponse> out = s.search("generator", 10);

        assertEquals(1, out.size());
        assertTrue(out.get(0).getDescription().contains("Generator"));
    }

    @Test
    void searchCanMatchByIdEvenWhenDisabled() {
        ServiceRequestSearchService s =
                new ServiceRequestSearchService(openSearchClient, jobService);
        setField(s, "enabled", false);
        when(jobService.getAllJobs(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(job(42, "Routine check", "Acme Corp", "PENDING"))));

        List<JobResponse> out = s.search("42", 10);

        assertEquals(1, out.size());
        assertEquals(42L, out.get(0).getId());
    }
}
