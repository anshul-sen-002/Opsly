package com.opsly.common.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger / OpenAPI configuration.
 * Swagger UI: http://localhost:8080/swagger-ui.html
 * API Docs:   http://localhost:8080/v3/api-docs
 *
 * Click "Authorize" and enter your Bearer JWT to test protected endpoints.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "Opsly API", version = "1.0", description = "Smart Service Operations Platform"),
        security = @SecurityRequirement(name = "bearer-jwt")
)
@SecurityScheme(
        name = "bearer-jwt",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER
)
public class SwaggerConfig {
}