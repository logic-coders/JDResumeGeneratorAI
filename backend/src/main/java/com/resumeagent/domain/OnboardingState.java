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
 * Tracks the user's onboarding progress through the /init workflow.
 * Stored as onboarding_state.json in the user's storage directory.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OnboardingState {

    public enum Status {
        NEW,
        IN_PROGRESS,
        COMPLETED
    }

    public enum Stage {
        BASIC_PROFILE,
        PROFESSIONAL_LINKS,
        RESUME_UPLOAD,
        RESUME_REVIEW,
        EXPERIENCE_ENRICHMENT,
        MASTER_GENERATION
    }

    @Builder.Default
    private Status status = Status.NEW;

    private Stage currentStage;

    @Builder.Default
    private List<Stage> completedStages = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;

    /**
     * Calculate onboarding completion percentage.
     */
    public int getCompletionPercentage() {
        if (status == Status.COMPLETED) return 100;
        if (status == Status.NEW) return 0;
        return (int) ((completedStages.size() / 6.0) * 100);
    }
}
