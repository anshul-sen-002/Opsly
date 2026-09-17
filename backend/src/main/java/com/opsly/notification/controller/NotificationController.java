package com.opsly.notification.controller;

import com.opsly.common.response.ApiResponse;
import com.opsly.notification.dto.NotificationResponse;
import com.opsly.notification.service.NotificationService;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Notification endpoints — every query is scoped to the authenticated user
 * (identity derived from the JWT, never from client params).
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Paged list of the current user's notifications (newest first)
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal User caller,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved",
                notificationService.getNotifications(caller, pageable)));
    }

    // Lightweight endpoint polled by the bell badge
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@AuthenticationPrincipal User caller) {
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved",
                notificationService.getUnreadCount(caller)));
    }

    // Mark a single notification read (ownership enforced in service)
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User caller) {
        notificationService.markRead(caller, id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read"));
    }

    // Mark every notification of the current user as read
    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal User caller) {
        notificationService.markAllRead(caller);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }
}