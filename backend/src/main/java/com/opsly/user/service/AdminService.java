package com.opsly.user.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ConflictException;
import com.opsly.common.exception.ForbiddenException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.repository.TechnicianRepository;
import com.opsly.user.dto.CreateStaffRequest;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.dto.UpdateStaffRequest;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AdminService handles staff account management.
 * Only callable by ADMIN role (enforced via @PreAuthorize in controller).
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;

    /**
     * Creates a staff account (ADMIN, MANAGER, or TECHNICIAN).
     * CUSTOMER role is rejected — customers register via public endpoint.
     */
    @Transactional
    public StaffResponse createStaff(CreateStaffRequest request) {
        // Prevent creating CUSTOMER accounts through staff endpoint
        if (request.getRole() == Role.CUSTOMER) {
            throw new BadRequestException("Use customer registration endpoint for CUSTOMER accounts");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        // If role is TECHNICIAN, also create the Technician profile
        if (request.getRole() == Role.TECHNICIAN) {
            Technician technician = Technician.builder()
                    .name(request.getName())
                    .phone(request.getPhone())
                    .specialization(request.getSpecialization())
                    .user(user)
                    .build();
            technicianRepository.save(technician);
        }

        return modelMapper.map(user, StaffResponse.class);
    }

    public Page<StaffResponse> getAllStaff(Pageable pageable, boolean deleted) {
        // Exclude CUSTOMER accounts — they are not staff.
        // deleted=false → active accounts, deleted=true → trash (restorable)
        Page<User> staff = userRepository.findByRoleNotAndDeleted(Role.CUSTOMER, deleted, pageable);
        // Merge the linked Technician profile (name, phone, specialization) into
        // the list response with ONE batched query — the User account alone has
        // no phone/name, which left the list showing "—" while the detail
        // endpoint (toDetailResponse) showed the values.
        Map<Long, Technician> technicianByUserId = staff.getContent().isEmpty()
                ? Map.of()
                : technicianRepository.findByUserIn(staff.getContent()).stream()
                        .collect(Collectors.toMap(t -> t.getUser().getId(), t -> t));
        return staff.map(user -> {
            StaffResponse response = modelMapper.map(user, StaffResponse.class);
            Technician technician = technicianByUserId.get(user.getId());
            if (technician != null) {
                response.setName(technician.getName());
                response.setPhone(technician.getPhone());
                response.setSpecialization(technician.getSpecialization());
            }
            return response;
        });
    }

    public StaffResponse getStaffById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toDetailResponse(user);
    }

    /**
     * Updates a staff account (email, name, role, phone, specialization).
     * Authorization rules:
     *   - ADMIN can update any staff account
     *   - MANAGER can update TECHNICIAN accounts only (not other MANAGERs or ADMINs)
     * Caller role is checked via callerRole parameter.
     */
    @Transactional
    public StaffResponse updateStaff(Long id, UpdateStaffRequest request, Role callerRole) {
        // Prevent updating to CUSTOMER role
        if (request.getRole() == Role.CUSTOMER) {
            throw new BadRequestException("Cannot change staff role to CUSTOMER");
        }

        User user = findUser(id);

        // Authorization: MANAGER cannot update ADMIN or another MANAGER
        if (callerRole == Role.MANAGER) {
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
                throw new ForbiddenException("Managers can only update Technician accounts");
            }
            // Prevent privilege escalation: a manager cannot grant ADMIN or MANAGER
            if (request.getRole() == Role.ADMIN || request.getRole() == Role.MANAGER) {
                throw new ForbiddenException("Managers cannot assign the ADMIN or MANAGER role");
            }
        }

        // Check email uniqueness if email is being changed
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        user.setEmail(request.getEmail());
        user.setRole(request.getRole());

        // Handle technician profile updates
        if (request.getRole() == Role.TECHNICIAN) {
            Technician technician = technicianRepository.findByUser(user).orElse(null);
            if (technician == null) {
                // Create technician profile if it doesn't exist (role changed to TECHNICIAN)
                technician = Technician.builder()
                        .name(request.getName())
                        .phone(request.getPhone())
                        .specialization(request.getSpecialization())
                        .user(user)
                        .build();
                technicianRepository.save(technician);
            } else {
                technician.setName(request.getName());
                technician.setPhone(request.getPhone());
                technician.setSpecialization(request.getSpecialization());
                technicianRepository.save(technician);
            }
        }

        return toDetailResponse(userRepository.save(user));
    }

    // Activate a staff account (INACTIVE -> ACTIVE). Idempotent.
    @Transactional
    public StaffResponse activateStaff(Long id) {
        User user = findUser(id);
        if (user.isDeleted()) {
            throw new BadRequestException("Restore the account before activating it");
        }
        if (user.getStatus() == UserStatus.ACTIVE) {
            return toResponse(user);
        }
        user.setStatus(UserStatus.ACTIVE);
        return toResponse(userRepository.save(user));
    }

    // Deactivate a staff account (soft disable). Idempotent.
    // ADMIN accounts cannot be deactivated — they are the system operators
    // and must always remain accessible for security/auditing.
    @Transactional
    public StaffResponse deactivateStaff(Long id) {
        User user = findUser(id);
        if (user.isDeleted()) {
            throw new BadRequestException("Cannot deactivate a deleted account");
        }
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Cannot deactivate an admin account");
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            return toResponse(user);
        }
        user.setStatus(UserStatus.INACTIVE);
        return toResponse(userRepository.save(user));
    }

    /**
     * Soft deletes a staff account.
     * The row is kept (deleted = true) so it can be restored later.
     */
    @Transactional
    public StaffResponse deleteStaff(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BadRequestException("You cannot delete your own account");
        }

        User user = findUser(id);
        if (user.isDeleted()) {
            throw new BadRequestException("Account is already deleted");
        }

        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setStatus(UserStatus.INACTIVE);
        return toResponse(userRepository.save(user));
    }

    // Restore a soft-deleted staff account
    @Transactional
    public StaffResponse restoreStaff(Long id) {
        User user = findUser(id);
        if (!user.isDeleted()) {
            throw new BadRequestException("Account is not deleted");
        }

        user.setDeleted(false);
        user.setDeletedAt(null);
        user.setStatus(UserStatus.ACTIVE);
        return toDetailResponse(userRepository.save(user));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private StaffResponse toResponse(User user) {
        return modelMapper.map(user, StaffResponse.class);
    }

    /**
     * Detail response — includes the linked Technician profile fields
     * (name, phone, specialization) when the account is a TECHNICIAN.
     */
    private StaffResponse toDetailResponse(User user) {
        StaffResponse response = toResponse(user);
        technicianRepository.findByUser(user).ifPresent(technician -> {
            response.setName(technician.getName());
            response.setPhone(technician.getPhone());
            response.setSpecialization(technician.getSpecialization());
        });
        return response;
    }
}
