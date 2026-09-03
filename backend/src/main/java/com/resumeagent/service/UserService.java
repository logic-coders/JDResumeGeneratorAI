package com.resumeagent.service;

import com.resumeagent.config.AppConfig;
import com.resumeagent.domain.OnboardingState;
import com.resumeagent.domain.UserProfile;
import com.resumeagent.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

/**
 * Manages user profile and onboarding state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final FileStorageService storageService;
    private final AppConfig appConfig;

    /**
     * Get user profile, or empty if not yet created.
     */
    public Optional<UserProfile> getProfile(String userId) {
        return storageService.readJson(
                storageService.getProfilePath(userId),
                UserProfile.class
        );
    }

    /**
     * Save or update user profile.
     */
    public UserProfile saveProfile(String userId, UserProfile profile) {
        storageService.writeJson(storageService.getProfilePath(userId), profile);
        log.info("Profile saved for user: {}", userId);
        return profile;
    }

    /**
     * Get onboarding state, defaults to NEW if not yet created.
     */
    public OnboardingState getOnboardingState(String userId) {
        return storageService.readJson(
                storageService.getOnboardingStatePath(userId),
                OnboardingState.class
        ).orElse(OnboardingState.builder()
                .status(OnboardingState.Status.NEW)
                .createdAt(Instant.now())
                .build());
    }

    /**
     * Save onboarding state.
     */
    public OnboardingState saveOnboardingState(String userId, OnboardingState state) {
        state.setUpdatedAt(Instant.now());
        storageService.writeJson(storageService.getOnboardingStatePath(userId), state);
        log.info("Onboarding state saved for user: {} (status: {}, stage: {})",
                userId, state.getStatus(), state.getCurrentStage());
        return state;
    }

    /**
     * Get the default user ID for the MVP (single-user mode).
     */
    public String getDefaultUserId() {
        return appConfig.getDefaultUserId();
    }
}
