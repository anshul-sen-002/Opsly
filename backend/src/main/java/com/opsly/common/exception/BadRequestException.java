package com.opsly.common.exception;

/**
 * Thrown for invalid business logic / validation failures.
 * Maps to HTTP 400.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
