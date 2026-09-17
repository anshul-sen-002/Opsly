package com.opsly.user.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ForbiddenException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.repository.TechnicianRepository;
import com.opsly.user.dto.UpdateMyProfileRequest;
import com.opsly.user.entity.Role;
import com.opsly.common.upload.CloudinaryService;
import com.opsly.common.upload.UploadResult;
import com.opsly.user.dto.StaffResponse;
import com.opsly.user.entity.User;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Profile image handling for the authenticated user.
 * The caller is always resolved from the JWT principal — userId is never trusted from the client.
 */
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final String PROFILE_FOLDER = "opsly/profile-images";
    private static final long MAX_IMAGE_BYTES = 3L * 1024 * 1024;

    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final ModelMapper modelMapper;
    private final TechnicianRepository technicianRepository;

    @Transactional(readOnly = true)
    public StaffResponse getMyProfile(User caller) {
        if (caller.getRole() != Role.TECHNICIAN) {
            // Matches the GET /api/technicians/me scope: technicians only.
            throw new ForbiddenException("Only technicians can use this profile endpoint");
        }
        return profileResponse(ownTechnician(caller));
    }

    @Transactional
    public StaffResponse updateMyProfile(User caller, UpdateMyProfileRequest request) {
        if (caller.getRole() != Role.TECHNICIAN) {
            // Matches the GET /api/technicians/me scope: technicians only.
            throw new ForbiddenException("Only technicians can use this profile endpoint");
        }
        Technician technician = ownTechnician(caller);
        technician.setName(request.getName().trim());
        technician.setPhone(request.getPhone());
        technician.setSpecialization(request.getSpecialization());
        technicianRepository.save(technician);
        return profileResponse(technician);
    }

    private Technician ownTechnician(User caller) {
        return technicianRepository.findByUser(caller)
                .orElseThrow(() -> new ResourceNotFoundException("Technician profile not found"));
    }

    private StaffResponse profileResponse(Technician technician) {
        StaffResponse response = modelMapper.map(technician.getUser(), StaffResponse.class);
        response.setName(technician.getName());
        response.setPhone(technician.getPhone());
        response.setSpecialization(technician.getSpecialization());
        return response;
    }

    /**
     * Replaces the caller's profile image. The previous Cloudinary asset is
     * deleted by its stored public_id so orphaned images do not accumulate.
     */
    @Transactional
    public StaffResponse updateProfileImage(User caller, MultipartFile file) {
        validateImage(file);
        UploadResult uploaded = cloudinaryService.upload(file, PROFILE_FOLDER);
        String previousPublicId = caller.getProfileImagePublicId();
        caller.setProfileImageUrl(uploaded.getSecureUrl());
        caller.setProfileImagePublicId(uploaded.getPublicId());
        StaffResponse response = modelMapper.map(userRepository.save(caller), StaffResponse.class);
        cloudinaryService.deleteQuietly(previousPublicId);
        return response;
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BadRequestException("Image must be under 3 MB");
        }
    }
}
