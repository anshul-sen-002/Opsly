package com.opsly.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.opsly.ai.config.AiConfig;
import com.opsly.ai.dto.ChatResponse;
import com.opsly.ai.tool.ToolRegistry;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * The agent loop talks to OpenRouter's OpenAI-compatible API. It must run the tools the
 * model asks for, feed the results back in the shape the server expects, and surface
 * real failures instead of a generic "Failed to reach the AI service".
 */
@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {

    private static final String BASE_URL = "https://openrouter.ai/api/v1";
    private static final String CHAT_URL = BASE_URL + "/chat/completions";

    @Mock AiConfig config;
    @Mock ToolRegistry toolRegistry;

    private MockRestServiceServer server;
    private AiChatService aiChatService;
    private User admin;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        aiChatService = new AiChatService(config, toolRegistry, builder.build(), new ObjectMapper());
        admin = User.builder()
                .email("admin@example.com").password("x").role(Role.ADMIN).status(UserStatus.ACTIVE)
                .build();

        when(config.isConfigured()).thenReturn(true);
        when(config.getBaseUrl()).thenReturn(BASE_URL);
        when(config.getModel()).thenReturn("qwen2.5:0.5b");
        when(config.getMaxTokens()).thenReturn(1024);
        when(config.getTemperature()).thenReturn(0.3);
        when(toolRegistry.getDefinitions()).thenReturn(List.of());
    }

    @Test
    void textAnswerEndsTheLoop() {
        server.expect(requestTo(CHAT_URL))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"There are 12 jobs."},"finish_reason":"stop"}]}
                        """, MediaType.APPLICATION_JSON));

        ChatResponse response = aiChatService.chat("how many total jobs are there", admin);

        assertEquals("There are 12 jobs.", response.getMessage());
        server.verify();
    }

    @Test
    void toolCallIsExecutedAndFeedsTheNextTurn() {
        when(toolRegistry.execute("count_jobs", "{\"status\":\"pending\"}", admin)).thenReturn("3 jobs");

        server.expect(requestTo(CHAT_URL))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_abc",
                        "type":"function","function":{"name":"count_jobs","arguments":"{\\"status\\":\\"pending\\"}"}}]},
                        "finish_reason":"tool_calls"}]}
                        """, MediaType.APPLICATION_JSON));
        // The follow-up turn must carry the tool result, keyed by the tool_call id
        server.expect(requestTo(CHAT_URL))
                .andExpect(jsonPath("$.messages[3].role").value("tool"))
                .andExpect(jsonPath("$.messages[3].tool_call_id").value("call_abc"))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"3 jobs are pending."},"finish_reason":"stop"}]}
                        """, MediaType.APPLICATION_JSON));

        ChatResponse response = aiChatService.chat("how many pending jobs?", admin);

        assertEquals("3 jobs are pending.", response.getMessage());
        assertEquals(1, response.getToolCalls().size());
        assertEquals("count_jobs", response.getToolCalls().get(0).getTool());
        assertEquals("3 jobs", response.getToolCalls().get(0).getResult());
        assertTrue(response.getToolCalls().get(0).isSuccess());
        server.verify();
    }

    @Test
    void ollamaErrorIsReportedWithStatusAndReason() {
        server.expect(requestTo(CHAT_URL))
                .andRespond(withStatus(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"model 'qwen2.5:0.5b' not found, try pulling it first\"}"));

        ChatResponse response = aiChatService.chat("how many total jobs are there", admin);

        assertTrue(response.getMessage().contains("404"), response.getMessage());
        assertTrue(response.getMessage().contains("not found"), response.getMessage());
        assertFalse(response.getMessage().contains("Failed to reach the AI service"), response.getMessage());
        server.verify();
    }
}