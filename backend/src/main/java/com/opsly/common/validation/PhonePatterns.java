package com.opsly.common.validation;

/**
 * Shared phone-number regexes for bean validation ({@code @Pattern}).
 *
 * Rule: optional leading "+", 7–20 characters made only of digits, spaces and
 * the common separators ( ) - . , containing at least 7 actual digits. So
 * "+1 555 000 1234" and "(555) 123-4567" pass while "56" or "call-me" are
 * rejected. Keep in sync with frontend/src/lib/validation.ts.
 */
public final class PhonePatterns {

    /** Phone is mandatory on the field (pair with {@code @NotBlank}). */
    public static final String REQUIRED =
            "^(?=.*\\d.*\\d.*\\d.*\\d.*\\d.*\\d.*\\d)\\+?[\\d\\s().-]{7,20}$";

    /** Phone may be omitted — null and the empty string are both accepted. */
    public static final String OPTIONAL = "^$|" + REQUIRED;

    /** Message shared by every phone {@code @Pattern} so the UI stays consistent. */
    public static final String MESSAGE = "Enter a valid phone number (at least 7 digits)";

    private PhonePatterns() {
    }
}
