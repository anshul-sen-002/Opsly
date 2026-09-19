package com.opsly.search.listener;

import com.opsly.notification.event.NotificationEvents;
import com.opsly.search.service.ServiceRequestSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Keeps the OpenSearch index in sync using the existing job events.
 * No change to JobService logic — this only listens. Failures never
 * break the originating flow (indexing is best-effort).
 */
@Component
@RequiredArgsConstructor
public class ServiceRequestIndexListener {

    private final ServiceRequestSearchService searchService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(NotificationEvents.JobCreatedEvent event) {
        if (event != null && event.jobId() != null) searchService.indexJob(event.jobId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatus(NotificationEvents.JobStatusEvent event) {
        if (event != null && event.jobId() != null) searchService.indexJob(event.jobId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAssigned(NotificationEvents.JobAssignedEvent event) {
        if (event != null && event.jobId() != null) searchService.indexJob(event.jobId());
    }
}
