package com.opsly.ai.controller;

import com.opsly.ai.dto.ChatRequest;
import com.opsly.ai.dto.ChatResponse;
import com.opsly.ai.service.AiChatService;
import com.opsly.common.response.ApiResponse;
import com.opsly.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI chat endpoint.
 *
 * Access: any authenticated user (ADMIN, MANAGER, TECHNICIAN, CUSTOMER).
 * Tool-level authorization is enforced inside ToolRegistry, not here.
 *
 * The authenticated user identity is resolved from the JWT and passed to the
 * service — never trusted from the request body.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AiChatController {

    private final AiChatService chatService;

    /**
     * POST /api/ai/chat
     *
     * Send a natural-language message to the AI assistant.
     * The AI will use tools appropriate for the caller's role.
     */
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal User caller) {

        ChatResponse response = chatService.chat(request.getMessage(), caller);
        return ResponseEntity.ok(ApiResponse.success("OK", response));
    }
}