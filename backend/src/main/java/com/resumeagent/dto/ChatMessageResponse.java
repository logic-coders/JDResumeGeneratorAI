package com.resumeagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for a chat message from the AI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private String conversationId;
    private String messageId;
    private String content;
    private String intent;
    private String command;

    // Optional structured data (match report, resume preview, etc.)
    private Map<String, Object> structuredData;
}
