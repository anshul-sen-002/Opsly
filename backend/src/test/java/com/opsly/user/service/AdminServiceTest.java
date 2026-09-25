package com.opsly.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import com.opsly.common.exception.ForbiddenException;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.repository.TechnicianRepository;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Regression test: the staff LIST endpoint must include the linked
 * Technician profile (name, phone, specialization), same as the detail
 * endpoint. The User account alone has no phone — it lives on Technician.
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock TechnicianRepository technicianRepository;
    @Mock PasswordEncoder passwordEncoder;

    private AdminService adminService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        adminService = new AdminService(
                userRepository, technicianRepository, passwordEncoder, new ModelMapper());
    }

    @Test
    void staffListMergesTechnicianProfileIntoRows() {
        User techUser = User.builder()
                .email("tech@example.com").password("x").role(Role.TECHNICIAN).status(UserStatus.ACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(techUser, "id", 1L);
        User adminUser = User.builder()
                .email("admin@example.com").password("x").role(Role.ADMIN).status(UserStatus.ACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", 2L);
        Page<User> page = new PageImpl<>(List.of(techUser, adminUser));
        when(userRepository.findByRoleNotAndDeleted(Role.CUSTOMER, false, PageRequest.of(0, 10)))
                .thenReturn(page);

        Technician technician = Technician.builder()
                .name("Ravi Kumar").phone("9876543210").specialization("AC repair").user(techUser)
                .build();
        when(technicianRepository.findByUserIn(anyCollection())).thenReturn(List.of(technician));

        Page<StaffResponse> result = adminService.getAllStaff(PageRequest.of(0, 10), false);

        StaffResponse technicianRow = result.getContent().get(0);
        org.junit.jupiter.api.Assertions.assertEquals("Ravi Kumar", technicianRow.getName());
        org.junit.jupiter.api.Assertions.assertEquals("9876543210", technicianRow.getPhone());
        org.junit.jupiter.api.Assertions.assertEquals("AC repair", technicianRow.getSpecialization());

        // Non-technician staff stay untouched — no invented phone values
        StaffResponse adminRow = result.getContent().get(1);
        assertNull(adminRow.getName());
        assertNull(adminRow.getPhone());
    }

    @Test
    void emptyStaffPageSkipsTechnicianLookup() {
        when(userRepository.findByRoleNotAndDeleted(Role.CUSTOMER, true, PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of()));

        Page<StaffResponse> result = adminService.getAllStaff(PageRequest.of(0, 10), true);

        org.junit.jupiter.api.Assertions.assertTrue(result.isEmpty());
        org.mockito.Mockito.verify(technicianRepository, never()).findByUserIn(anyCollection());
    }

    // --- Status change (activate/deactivate) --------------------------------

    @Test
    void managerCanActivateTechnician() {
        User tech = User.builder()
                .email("tech2@example.com").password("x").role(Role.TECHNICIAN).status(UserStatus.INACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(tech, "id", 10L);
        when(userRepository.findById(10L)).thenReturn(Optional.of(tech));
        when(userRepository.save(tech)).thenReturn(tech);

        StaffResponse response = adminService.activateStaff(10L, Role.MANAGER);

        assertEquals(UserStatus.ACTIVE, response.getStatus());
        verify(userRepository).save(tech);
    }

    @Test
    void managerCannotDeactivateManagerAccount() {
        User otherManager = User.builder()
                .email("mgr@example.com").password("x").role(Role.MANAGER).status(UserStatus.ACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(otherManager, "id", 11L);
        when(userRepository.findById(11L)).thenReturn(Optional.of(otherManager));

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> adminService.deactivateStaff(11L, Role.MANAGER));

        assertTrue(ex.getMessage().contains("Technician"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void managerCannotActivateAdminAccount() {
        User admin = User.builder()
                .email("admin2@example.com").password("x").role(Role.ADMIN).status(UserStatus.INACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(admin, "id", 12L);
        when(userRepository.findById(12L)).thenReturn(Optional.of(admin));

        assertThrows(ForbiddenException.class, () -> adminService.activateStaff(12L, Role.MANAGER));
        verify(userRepository, never()).save(any());
    }

    @Test
    void adminCanDeactivateAnyStaffAccount() {
        User target = User.builder()
                .email("mgr2@example.com").password("x").role(Role.MANAGER).status(UserStatus.ACTIVE)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(target, "id", 13L);
        when(userRepository.findById(13L)).thenReturn(Optional.of(target));
        when(userRepository.save(target)).thenReturn(target);

        StaffResponse response = adminService.deactivateStaff(13L, Role.ADMIN);

        assertEquals(UserStatus.INACTIVE, response.getStatus());
        verify(userRepository).save(target);
    }
}
