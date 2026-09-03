package com.resumeagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO from the Python AI service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiServiceResponse {

    private String response;
    private String intent;
    private String command;
    private String agentType;

    // Structured data the AI returns (e.g., parsed resume, match report, updated onboarding state)
    private Map<String, Object> data;

    // Actions the frontend should take (e.g., show_buttons, show_file_upload, show_match_report)
    private Map<String, Object> actions;
}
