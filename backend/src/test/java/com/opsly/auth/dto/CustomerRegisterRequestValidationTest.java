package com.opsly.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.opsly.common.validation.PhonePatterns;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Customer self-registration is public, so the phone number has to survive a
 * real format check — "56" must not create an account.
 */
class CustomerRegisterRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CustomerRegisterRequest validRequest() {
        CustomerRegisterRequest request = new CustomerRegisterRequest();
        request.setName("Jane Smith");
        request.setEmail("jane@example.com");
        request.setPhone("9876543210");
        request.setPassword("secret123");
        return request;
    }

    private Set<String> messages(CustomerRegisterRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    @Test
    void acceptsAPlainTenDigitNumber() {
        assertThat(messages(validRequest())).isEmpty();
    }

    @Test
    void acceptsFormattedNumbers() {
        for (String phone : new String[] { "+1 555 000 1234", "(555) 123-4567", "020-7946-0958", "+91 98765 43210" }) {
            CustomerRegisterRequest request = validRequest();
            request.setPhone(phone);
            assertThat(messages(request)).as("phone %s should be accepted", phone).isEmpty();
        }
    }

    @Test
    void rejectsTooShortNumbers() {
        for (String phone : new String[] { "56", "1", "123456" }) {
            CustomerRegisterRequest request = validRequest();
            request.setPhone(phone);
            assertThat(messages(request))
                    .as("phone %s should be rejected", phone)
                    .contains(PhonePatterns.MESSAGE);
        }
    }

    @Test
    void rejectsTooFewDigitsHiddenBehindSeparators() {
        CustomerRegisterRequest request = validRequest();
        request.setPhone("(12) 34-56");
        assertThat(messages(request)).contains(PhonePatterns.MESSAGE);
    }

    @Test
    void rejectsNonNumericInput() {
        for (String phone : new String[] { "call-me", "98765abcde", "12/34/5678" }) {
            CustomerRegisterRequest request = validRequest();
            request.setPhone(phone);
            assertThat(messages(request))
                    .as("phone %s should be rejected", phone)
                    .contains(PhonePatterns.MESSAGE);
        }
    }

    @Test
    void rejectsMissingPhone() {
        CustomerRegisterRequest request = validRequest();
        request.setPhone(null);
        assertThat(messages(request)).contains("Phone is required");
    }
}
