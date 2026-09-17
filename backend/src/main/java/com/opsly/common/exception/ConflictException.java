package com.opsly.common.exception;

/**
 * Thrown when a resource already exists (e.g., duplicate email).
 * Maps to HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
