package com.opsly.common.upload;

import lombok.Getter;

/**
 * Result of a Cloudinary upload — the fields the app persists.
 */
@Getter
public class UploadResult {

    private final String secureUrl;
    private final String publicId;

    public UploadResult(String secureUrl, String publicId) {
        this.secureUrl = secureUrl;
        this.publicId = publicId;
    }
}
