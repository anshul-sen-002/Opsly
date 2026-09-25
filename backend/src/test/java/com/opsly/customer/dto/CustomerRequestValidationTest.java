package com.opsly.customer.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.opsly.common.validation.PhonePatterns;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * The email is required on every customer write — grant portal access and the
 * login identity both rely on the contact email being present on the record.
 */
class CustomerRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CustomerRequest validRequest() {
        CustomerRequest request = new CustomerRequest();
        request.setName("Jane Smith");
        request.setPhone("9876543210");
        request.setEmail("jane@example.com");
        return request;
    }

    private Set<String> messages(CustomerRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    @Test
    void acceptsAWellFormedEmail() {
        assertThat(messages(validRequest())).isEmpty();
    }

    @Test
    void rejectsBlankEmail() {
        CustomerRequest request = validRequest();
        request.setEmail("   ");
        assertThat(messages(request)).contains("Email is required");
    }

    @Test
    void rejectsMissingEmail() {
        CustomerRequest request = validRequest();
        request.setEmail(null);
        assertThat(messages(request)).contains("Email is required");
    }

    @Test
    void rejectsMalformedEmail() {
        CustomerRequest request = validRequest();
        request.setEmail("not-an-email");
        assertThat(messages(request)).contains("Invalid email format");
    }

    @Test
    void acceptsAFormattedPhone() {
        CustomerRequest request = validRequest();
        request.setPhone("+1 555 000 1234");
        assertThat(messages(request)).isEmpty();
    }

    @Test
    void rejectsTooShortPhone() {
        CustomerRequest request = validRequest();
        request.setPhone("56");
        assertThat(messages(request)).contains(PhonePatterns.MESSAGE);
    }
}