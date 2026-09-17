package com.opsly.technician.service;

import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.technician.dto.TechnicianResponse;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.repository.TechnicianRepository;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * TechnicianService handles read operations for Technician profiles.
 * Technician creation is handled by AdminService (staff account creation).
 */
@Service
@RequiredArgsConstructor
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final ModelMapper modelMapper;

        public Page<TechnicianResponse> getAllTechnicians(Pageable pageable) {
        return technicianRepository.findAll(pageable).map(this::toResponse);
    }

    public TechnicianResponse getTechnicianById(Long id) {
        return toResponse(findById(id));
    }

    /**
     * TECHNICIAN: read their own profile.
     * Identity comes from the JWT-authenticated User — never from a client-supplied id.
     */
    public TechnicianResponse getMyProfile(User caller) {
        Technician technician = technicianRepository.findByUser(caller)
            .orElseThrow(() -> new ResourceNotFoundException("Technician profile not found"));
        return toResponse(technician);
    }

    // Used by job service to link technician to authenticated user
    public Technician findByUser(User user) {
        return technicianRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Technician profile not found for this user"));
    }

    public Technician findById(Long id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician", id));
    }

    private TechnicianResponse toResponse(Technician technician) {
        TechnicianResponse response = modelMapper.map(technician, TechnicianResponse.class);
        // Pull email from the linked User account
        response.setEmail(technician.getUser().getEmail());
        response.setUserId(technician.getUser().getId());
        return response;
    }
}