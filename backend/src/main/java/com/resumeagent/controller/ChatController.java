package com.resumeagent.controller;

import com.resumeagent.config.AppConfig;
import com.resumeagent.domain.Conversation;
import com.resumeagent.dto.ChatMessageRequest;
import com.resumeagent.dto.ChatMessageResponse;
import com.resumeagent.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for chat operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final AppConfig appConfig;

    /**
     * Send a chat message and get an AI response.
     */
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @Valid @RequestBody ChatMessageRequest request) {
        log.info("Received chat message: {}", request.getMessage());
        ChatMessageResponse response = chatService.processMessage(request);
        return ResponseEntity.ok(response);
    }

    /**
     * List all conversations.
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<Conversation>> listConversations() {
        String userId = appConfig.getDefaultUserId();
        List<Conversation> conversations = chatService.listConversations(userId);
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get a specific conversation with all messages.
     */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<Conversation> getConversation(
            @PathVariable String conversationId) {
        String userId = appConfig.getDefaultUserId();
        return chatService.loadConversation(userId, conversationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new conversation.
     */
    @PostMapping("/conversations")
    public ResponseEntity<Conversation> createConversation() {
        String userId = appConfig.getDefaultUserId();
        Conversation conversation = chatService.createConversation(userId);
        return ResponseEntity.ok(conversation);
    }

    /**
     * Delete a conversation.
     */
    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable String conversationId) {
        String userId = appConfig.getDefaultUserId();
        boolean deleted = chatService.deleteConversation(userId, conversationId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
