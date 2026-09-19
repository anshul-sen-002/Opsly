package com.opsly.search.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.HttpHost;
import org.opensearch.client.RestClient;
import org.opensearch.client.json.jackson.JacksonJsonpMapper;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.rest_client.RestClientTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Local OpenSearch client. Disabled unless {@code app.opensearch.enabled=true}.
 * No Docker involved — points at whatever host/port is configured (default localhost:9200).
 */
@Configuration
public class OpenSearchConfig {

    @Value("${app.opensearch.host:localhost}")
    private String host;

    @Value("${app.opensearch.port:9200}")
    private int port;

    @Value("${app.opensearch.scheme:http}")
    private String scheme;

    @Bean(destroyMethod = "close")
    public RestClient openSearchRestClient() {
        return RestClient.builder(new HttpHost(host, port, scheme)).build();
    }

    @Bean
    public OpenSearchClient openSearchClient(RestClient restClient, ObjectMapper objectMapper) {
        return new OpenSearchClient(
                new RestClientTransport(restClient, new JacksonJsonpMapper(objectMapper)));
    }
}
