package com.opsly.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * AI module configuration.
 *
 * Provider: Amazon Bedrock, called directly over HTTPS with a Bedrock API key
 * (sent as a bearer token). No AWS SDK and no signed requests are involved.
 *
 * All values come from application.properties / environment variables.
 * The RestClient bean targets the Bedrock Runtime endpoint with the auth header pre-set.
 */
@Configuration
public class AiConfig {

    @Value("${app.ai.bedrock.api-key:}")
    private String apiKey;

    @Value("${app.ai.bedrock.endpoint}")
    private String endpoint;

    @Value("${app.ai.bedrock.model-id:}")
    private String modelId;

    @Value("${app.ai.bedrock.max-tokens:1024}")
    private int maxTokens;

    @Value("${app.ai.bedrock.temperature:0.3}")
    private double temperature;

    public String getEndpoint()    { return endpoint; }
    public String getModelId()     { return modelId; }
    public int    getMaxTokens()   { return maxTokens; }
    public double getTemperature() { return temperature; }

    /** The assistant works only when both the API key and a foundation model id are configured. */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank()
                && modelId != null && !modelId.isBlank();
    }

    @Bean
    public RestClient bedrockClient(RestClient.Builder builder) {
        return builder
                .baseUrl(endpoint)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}