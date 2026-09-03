package com.resumeagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * Request DTO for sending a chat message.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {

    private String conversationId;

    @NotBlank(message = "Message cannot be empty")
    private String message;

    private List<String> attachments;
}
