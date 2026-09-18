package com.opsly.notification.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.opsly.notification.dto.NotificationResponse;
import com.opsly.notification.entity.Notification;
import com.opsly.notification.entity.NotificationType;
import com.opsly.notification.repository.NotificationRepository;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * The dropdown feed must query UNREAD rows only: after an entry is read it
 * must never reappear in the list, and reads must never be mutated by GET.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock com.opsly.user.repository.UserRepository userRepository;

    @InjectMocks NotificationService notificationService;

    private User caller;

    @BeforeEach
    void setUp() {
        caller = User.builder().email("admin@example.com").password("x").role(Role.ADMIN).build();
        org.springframework.test.util.ReflectionTestUtils.setField(caller, "id", 1L);
    }

    @Test
    void feedQueriesUnreadOnly() {
        Pageable pageable = PageRequest.of(0, 15);
        Notification unread = Notification.builder()
                .id(10L).user(caller).type(NotificationType.CUSTOMER_REGISTERED)
                .title("New customer registered").build();
        when(notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(unread)));

        var page = notificationService.getNotifications(caller, pageable);

        assertTrue(page.getContent().get(0).isRead() == false);
        org.mockito.Mockito.verify(notificationRepository)
                .findByUserIdAndReadFalseOrderByCreatedAtDesc(1L, pageable);
        // The all-rows query must not be used for the feed anymore
        org.mockito.Mockito.verify(notificationRepository, org.mockito.Mockito.never())
                .findByUserIdOrderByCreatedAtDesc(anyLong(), any(Pageable.class));
    }
}
