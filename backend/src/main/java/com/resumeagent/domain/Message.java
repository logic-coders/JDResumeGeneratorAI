package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * A single message in a conversation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Message {

    public enum Role {
        USER,
        ASSISTANT,
        SYSTEM
    }

    private String messageId;
    private Role role;
    private String content;
    private Instant timestamp;

    @Builder.Default
    private List<String> attachments = new ArrayList<>();

    // Metadata for tracking intent, command, workflow state
    private Map<String, Object> metadata;
}
