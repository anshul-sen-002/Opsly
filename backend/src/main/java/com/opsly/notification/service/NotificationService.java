package com.opsly.notification.service;

import com.opsly.common.exception.ForbiddenException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.notification.dto.NotificationResponse;
import com.opsly.notification.entity.Notification;
import com.opsly.notification.entity.NotificationType;
import com.opsly.notification.repository.NotificationRepository;
import com.opsly.user.entity.User;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Notification service — reads are scoped to the authenticated user (identity
 * from JWT), creation is called by the event listener after business commits.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public Page<NotificationResponse> getNotifications(User user, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(NotificationResponse::from);
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    /** Mark one notification read — ownership enforced (identity from JWT). */
    @Transactional
    public void markRead(User user, Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You do not have access to this notification");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    /** Mark every notification of the current user as read. */
    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }

    /** Create one notification — called by the event listener, never by controllers. */
    @Transactional
    public void create(Long recipientUserId, NotificationType type, String title, String message, String link) {
        Notification notification = Notification.builder()
                .user(userRepository.getReferenceById(recipientUserId))
                .type(type)
                .title(title)
                .message(message)
                .link(link)
                .build();
        notificationRepository.save(notification);
    }
}