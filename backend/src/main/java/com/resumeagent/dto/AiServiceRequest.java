package com.resumeagent.dto;

import com.resumeagent.domain.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO sent from Spring Boot to the Python AI service.
 * Contains the user's message along with full context needed for AI processing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiServiceRequest {

    private String message;
    private String conversationId;
    private List<MessageDto> conversationHistory;
    private UserProfile userProfile;
    private OnboardingState onboardingState;
    private Resume masterResume;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageDto {
        private String role;
        private String content;
    }
}
