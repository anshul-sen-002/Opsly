package com.opsly.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * AI module configuration.
 * All values come from application.properties / environment variables.
 * The RestClient bean is scoped to OpenRouter — base URL + auth header pre-set.
 */
@Configuration
public class AiConfig {

    @Value("${app.ai.openrouter.api-key:}")
    private String apiKey;

    @Value("${app.ai.openrouter.base-url}")
    private String baseUrl;

    @Value("${app.ai.openrouter.model}")
    private String model;

    @Value("${app.ai.openrouter.max-tokens:1024}")
    private int maxTokens;

    @Value("${app.ai.openrouter.temperature:0.3}")
    private double temperature;

    public String getModel()       { return model; }
    public int    getMaxTokens()   { return maxTokens; }
    public double getTemperature() { return temperature; }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Bean
    public RestClient openRouterClient(RestClient.Builder builder) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                // OpenRouter requires HTTP-Referer and X-Title for free-tier models
                .defaultHeader("HTTP-Referer", "https://opsly.app")
                .defaultHeader("X-Title", "Opsly")
                .build();
    }
}