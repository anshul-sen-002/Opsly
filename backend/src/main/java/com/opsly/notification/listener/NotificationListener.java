package com.opsly.notification.listener;

import com.opsly.notification.entity.NotificationType;
import com.opsly.notification.event.NotificationEvents.*;
import com.opsly.notification.service.NotificationService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns committed business events into persistent notifications.
 * Runs AFTER_COMMIT so a rolled-back job assignment never notifies anyone,
 * and a notification is never lost because the reader transaction failed.
 */
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onJobAssigned(JobAssignedEvent event) {
        notificationService.create(
                event.technicianUserId(),
                NotificationType.JOB_ASSIGNED,
                "New job assigned",
                "Job #JOB-" + event.jobId() + " has been assigned to you.",
                "/jobs/" + event.jobId()
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onJobCreated(JobCreatedEvent event) {
        String message = "New service request #JOB-" + event.jobId() + " from " + event.customerName() + ".";
        for (Long recipientId : findStaffRecipientIds()) {
            notificationService.create(recipientId, NotificationType.JOB_CREATED, "New service request", message, "/jobs/" + event.jobId());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onJobStatus(JobStatusEvent event) {
        List<Long> recipientIds = new ArrayList<>(findStaffRecipientIds());
        if (event.customerUserId() != null && !recipientIds.contains(event.customerUserId())) {
            recipientIds.add(event.customerUserId());
        }
        if (event.technicianUserId() != null && !recipientIds.contains(event.technicianUserId())) {
            recipientIds.add(event.technicianUserId());
        }

        NotificationType type = switch (event.newStatus()) {
            case IN_PROGRESS -> NotificationType.JOB_STARTED;
            case COMPLETED -> NotificationType.JOB_COMPLETED;
            case CLOSED -> NotificationType.JOB_CLOSED;
            default -> throw new IllegalArgumentException("No notification type for status " + event.newStatus());
        };

        String title = switch (event.newStatus()) {
            case IN_PROGRESS -> "Job started";
            case COMPLETED -> "Job completed";
            case CLOSED -> "Job closed";
            default -> "Job updated";
        };
        String message = "Job #JOB-" + event.jobId() + " is now " + event.newStatus().name().replace("_", " ") + ".";
        String link = "/jobs/" + event.jobId();

        for (Long recipientId : recipientIds) {
            notificationService.create(recipientId, type, title, message, link);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInvoiceIssued(InvoiceIssuedEvent event) {
        if (event.customerUserId() == null) {
            return; // customer has no login account — nothing to notify
        }
        notificationService.create(
                event.customerUserId(),
                NotificationType.INVOICE_ISSUED,
                "New invoice issued",
                "Invoice " + event.invoiceNumber() + " for " + formatAmount(event.totalAmount())
                        + " is now available in your portal.",
                "/customer/invoices"
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentReceived(PaymentReceivedEvent event) {
        String message = formatAmount(event.amount()) + " received against " + event.invoiceNumber() + ".";
        for (Long recipientId : findStaffRecipientIds()) {
            notificationService.create(recipientId, NotificationType.PAYMENT_RECEIVED,
                    "Payment received", message, "/payments");
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCustomerRegistered(CustomerRegisteredEvent event) {
        String message = event.customerName() + " (" + event.customerEmail() + ") joined the portal.";
        for (Long recipientId : findStaffRecipientIds()) {
            notificationService.create(recipientId, NotificationType.CUSTOMER_REGISTERED,
                    "New customer registered", message, "/customers");
        }
    }

    // Admins and managers follow business activity — customers and technicians do not
    private List<Long> findStaffRecipientIds() {
        return userRepository.findByRoleInAndDeletedFalse(List.of(Role.ADMIN, Role.MANAGER))
                .stream()
                .map(User::getId)
                .toList();
    }

    private String formatAmount(BigDecimal amount) {
        return "₹" + amount.stripTrailingZeros().toPlainString();
    }
}