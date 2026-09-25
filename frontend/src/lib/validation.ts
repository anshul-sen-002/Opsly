/**
 * Phone validation shared by the register, staff and customer forms.
 *
 * Accepted: an optional leading "+", 7–20 characters made only of digits,
 * spaces and the common separators ( ) - . , holding at least 7 real digits.
 * So "+1 555 000 1234" and "(555) 123-4567" pass, while "56" or
 * "call-me" are rejected. Mirrors the backend @Pattern regex in
 * backend/src/main/java/com/opsly/common/validation/PhonePatterns.java
 */
const PHONE_PATTERN = /^(?=.*\d.*\d.*\d.*\d.*\d.*\d.*\d)\+?[\d\s().-]{7,20}$/;

/** True when the value is a phone number we are willing to store. Empty / null is not valid here. */
export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return PHONE_PATTERN.test(value.trim());
}

export const PHONE_ERROR_MESSAGE = "Enter a valid phone number (at least 7 digits)";
