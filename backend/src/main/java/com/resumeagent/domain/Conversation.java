package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A chat conversation containing a list of messages.
 * Stored as conversation_{id}.json in the user's conversations directory.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Conversation {

    public enum Status {
        ACTIVE,
        COMPLETED,
        PAUSED,
        CANCELLED
    }

    private String conversationId;
    private String title;

    @Builder.Default
    private Status status = Status.ACTIVE;

    private Instant createdAt;
    private Instant updatedAt;

    @Builder.Default
    private List<Message> messages = new ArrayList<>();
}
