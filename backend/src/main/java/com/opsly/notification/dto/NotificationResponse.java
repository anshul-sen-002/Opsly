package com.opsly.notification.dto;

import com.opsly.notification.entity.Notification;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;


/** API output shape for a single notification */
@Getter
@Setter
public class NotificationResponse {

    private Long id;
    private String type;
    private String title;
    private String message;
    private String link;
    private boolean read;
    private Instant createdAt;

    public static NotificationResponse from(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType().name());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setLink(notification.getLink());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }
}