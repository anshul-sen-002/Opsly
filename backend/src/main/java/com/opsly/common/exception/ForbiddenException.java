package com.opsly.common.exception;

/**
 * Thrown when an authenticated user tries to access a resource they are not authorized for.
 * Maps to HTTP 403.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
