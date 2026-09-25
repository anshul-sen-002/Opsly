package com.opsly.user.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.opsly.common.validation.PhonePatterns;
import com.opsly.user.entity.Role;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Staff phone is optional, but a supplied value must be a plausible number —
 * this is the form the manager/admin portal posts from.
 */
class StaffPhoneValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CreateStaffRequest validCreateRequest() {
        CreateStaffRequest request = new CreateStaffRequest();
        request.setName("Jane Smith");
        request.setEmail("jane@example.com");
        request.setPassword("secret123");
        request.setRole(Role.TECHNICIAN);
        request.setSpecialization("Electrical");
        return request;
    }

    private UpdateStaffRequest validUpdateRequest() {
        UpdateStaffRequest request = new UpdateStaffRequest();
        request.setName("Jane Smith");
        request.setEmail("jane@example.com");
        request.setRole(Role.MANAGER);
        return request;
    }

    private Set<String> messages(Object request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    @Test
    void createAcceptsAMissingPhone() {
        assertThat(messages(validCreateRequest())).isEmpty();
    }

    @Test
    void updateAcceptsAMissingPhone() {
        assertThat(messages(validUpdateRequest())).isEmpty();
    }

    @Test
    void createAcceptsAnEmptyPhone() {
        CreateStaffRequest request = validCreateRequest();
        request.setPhone("");
        assertThat(messages(request)).isEmpty();
    }

    @Test
    void createAcceptsAFormattedPhone() {
        CreateStaffRequest request = validCreateRequest();
        request.setPhone("+1 555 000 1234");
        assertThat(messages(request)).isEmpty();
    }

    @Test
    void createRejectsTooShortPhones() {
        for (String phone : new String[] { "56", "12345", "not-a-phone" }) {
            CreateStaffRequest request = validCreateRequest();
            request.setPhone(phone);
            assertThat(messages(request))
                    .as("phone %s should be rejected", phone)
                    .contains(PhonePatterns.MESSAGE);
        }
    }

    @Test
    void updateRejectsTooShortPhones() {
        for (String phone : new String[] { "56", "12345", "not-a-phone" }) {
            UpdateStaffRequest request = validUpdateRequest();
            request.setPhone(phone);
            assertThat(messages(request))
                    .as("phone %s should be rejected", phone)
                    .contains(PhonePatterns.MESSAGE);
        }
    }

    @Test
    void selfServiceProfileRejectsTooShortPhones() {
        UpdateMyProfileRequest request = new UpdateMyProfileRequest();
        request.setName("Jane Smith");
        request.setPhone("56");
        assertThat(messages(request)).contains(PhonePatterns.MESSAGE);
    }

    @Test
    void selfServiceProfileAcceptsAFormattedPhoneAndOmission() {
        UpdateMyProfileRequest formatted = new UpdateMyProfileRequest();
        formatted.setName("Jane Smith");
        formatted.setPhone("(555) 123-4567");
        assertThat(messages(formatted)).isEmpty();

        UpdateMyProfileRequest omitted = new UpdateMyProfileRequest();
        omitted.setName("Jane Smith");
        assertThat(messages(omitted)).isEmpty();
    }
}
