package com.opsly.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * AI module configuration.
 *
 * Provider: OpenRouter (https://openrouter.ai) — an OpenAI-compatible API that proxies
 * many models. Called over HTTPS with a Bearer API key; no self-hosted server and no
 * SDK are involved.
 *
 * All values come from application.properties / environment variables.
 * The RestClient bean is scoped to OpenRouter — base URL + auth header pre-set.
 */
@Configuration
public class AiConfig {

    // IMPORTANT: apiKey ko User-scope OS env se load hone do (spring ki
    // ${...} placeholder yahan User env ko resolve karti hai jab tak OS env override kare).
    // Agar spring API key load nahi kar paye ya stale value dein, to openRouterClient()
    // niche .env file se fallback lekar fresh bean banayega.
    @Value("${app.ai.openrouter.api-key:}")
    private String apiKey;

    @Value("${app.ai.openrouter.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${app.ai.openrouter.model:google/gemini-2.5-flash-preview-04-17}")
    private String model;

    @Value("${app.ai.openrouter.max-tokens:1024}")
    private int maxTokens;

    @Value("${app.ai.openrouter.temperature:0.3}")
    private double temperature;

    /** Trailing slashes are stripped so URL building stays predictable. */
    public String getBaseUrl()     { return baseUrl == null ? null : baseUrl.replaceAll("/+$", ""); }
    public String getApiKey()     { return apiKey; }
    public boolean hasApiKey()    { return apiKey != null && !apiKey.isBlank(); }
    public String getModel()       { return model; }
    public int    getMaxTokens()   { return maxTokens; }
    public double getTemperature() { return temperature; }

    /** The assistant works only when both the API key and a model are configured. */
    public boolean isConfigured() {
        return effectiveKeyForCheck() != null && !effectiveKeyForCheck().isBlank()
                && model != null && !model.isBlank();
    }

    /**
     * Startup par safe fingerprint log: key kabhi print nahi hoti, sirf length +
     * pehle/aakhri 4 chars — isse hum verify kar sakte hain ki backend ne kaun si
     * key load ki (stale ...b2da vs correct ...2365).
     */
    @jakarta.annotation.PostConstruct
    public void logKeyFingerprint() {
        String key = resolveApiKey();
        if (key == null || key.isBlank()) {
            org.slf4j.LoggerFactory.getLogger(AiConfig.class)
                    .warn("OpenRouter API key missing/blank; AI chat will report not-configured.");
            return;
        }
        String head = key.substring(0, Math.min(8, key.length()));
        String tail = key.substring(Math.max(0, key.length() - 4));
        org.slf4j.LoggerFactory.getLogger(AiConfig.class).info(
                "OpenRouter key loaded: len={} head={} tail={} sourceHint=backend/.env-or-value model={}",
                key.length(), head, tail, model);
    }

    private String effectiveKeyForCheck() {
        return resolveApiKey();
    }

    @Bean
    public RestClient openRouterClient(RestClient.Builder builder) {
        // Root cause fix: kabhi-kabhi spring app.ai.openrouter.api-key me stale/empty key
        // resolve karta hai (OS env override + @Value timing). Isliye header lagane se
        // pehle .env file (backend/.env) se fresh OPENROUTER_API_KEY uthate hain;
        // agar woh missing ho tabhi @Value wali key use hoti hai.
        String effectiveKey = resolveApiKey();
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + effectiveKey)
                .defaultHeader("Content-Type", "application/json")
                // OpenRouter free-tier models require these two headers
                .defaultHeader("HTTP-Referer", "https://opsly.app")
                .defaultHeader("X-Title", "Opsly")
                .build();
    }

    /**
     * backend/.env file se OPENROUTER_API_KEY padhta hai (primary source of truth).
     * @Value wali key par sirf tab bharosa hota hai jab .env file missing/unreadable ho.
     * Key kabhi log nahi hoti — sirf fingerprint (length/first/last) log me aata hai.
     */
    private String resolveApiKey() {
        String value = apiKey;
        try {
            java.nio.file.Path env = java.nio.file.Paths.get(
                    System.getProperty("user.dir"), ".env");
            if (!java.nio.file.Files.isRegularFile(env)) {
                // jar packed layout me bhi backend root par .env ho sakta hai
                env = java.nio.file.Paths.get(".env").toAbsolutePath();
            }
            for (String line : java.nio.file.Files.readAllLines(env)) {
                String trimmed = line.trim();
                if (trimmed.startsWith("OPENROUTER_API_KEY=")) {
                    String fileKey = trimmed.substring("OPENROUTER_API_KEY=".length()).trim();
                    // surrounding quotes hata do: KEY="..."/KEY='...'
                    if (fileKey.length() >= 2
                            && ((fileKey.startsWith("\"") && fileKey.endsWith("\""))
                                    || (fileKey.startsWith("'") && fileKey.endsWith("'")))) {
                        fileKey = fileKey.substring(1, fileKey.length() - 1).trim();
                    }
                    if (!fileKey.isEmpty()) {
                        value = fileKey;
                    }
                    break;
                }
            }
        } catch (Exception ignored) {
            // fallback: @Value wali key
        }
        return value == null ? "" : value.trim();
    }
}