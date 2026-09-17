package com.opsly.common.upload;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.opsly.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Reusable Cloudinary upload service shared by profile images and invoice files.
 * Uploads go to per-feature folders; deletion is by stored public_id.
 */
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final ObjectProvider<Cloudinary> cloudinaryProvider;

    /**
     * Uploads a file to the given Cloudinary folder.
     * Validates the file is non-empty and fails fast when Cloudinary is not configured.
     */
    @SuppressWarnings("unchecked")
    public UploadResult upload(MultipartFile file, String folder) {
        Cloudinary cloudinary = requireConfigured();
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty");
        }
        try {
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", folder, "resource_type", "auto"));
            return new UploadResult(
                    String.valueOf(result.get("secure_url")),
                    String.valueOf(result.get("public_id")));
        } catch (IOException e) {
            throw new BadRequestException("File upload failed");
        }
    }

    /**
     * Deletes an asset by public_id. No-op for blank ids.
     * Deletion failures never fail the calling request — the DB update wins.
     */
    public void deleteQuietly(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        Cloudinary cloudinary = cloudinaryProvider.getIfAvailable();
        if (cloudinary == null) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception ignored) {
            // Best-effort cleanup — stale Cloudinary assets are harmless.
        }
    }

    private Cloudinary requireConfigured() {
        Cloudinary cloudinary = cloudinaryProvider.getIfAvailable();
        if (cloudinary == null) {
            throw new BadRequestException("File uploads are not configured");
        }
        return cloudinary;
    }
}
