package com.resumeagent.controller;

import com.resumeagent.domain.OnboardingState;
import com.resumeagent.domain.UserProfile;
import com.resumeagent.service.UserService;
import com.resumeagent.service.ResumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST controller for user profile and onboarding operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ResumeService resumeService;

    /**
     * Get current user profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfile> getProfile() {
        String userId = userService.getDefaultUserId();
        return userService.getProfile(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update user profile.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfile> updateProfile(@RequestBody UserProfile profile) {
        String userId = userService.getDefaultUserId();
        UserProfile saved = userService.saveProfile(userId, profile);
        return ResponseEntity.ok(saved);
    }

    /**
     * Get onboarding status.
     */
    @GetMapping("/onboarding/status")
    public ResponseEntity<OnboardingState> getOnboardingStatus() {
        String userId = userService.getDefaultUserId();
        OnboardingState state = userService.getOnboardingState(userId);
        return ResponseEntity.ok(state);
    }

    /**
     * Upload a resume PDF.
     */
    @PostMapping("/resume/upload")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @RequestParam("file") MultipartFile file) {
        String userId = userService.getDefaultUserId();
        log.info("Resume upload received: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        try {
            Map<String, Object> result = resumeService.processUploadedResume(userId, file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Resume upload failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Failed to process resume: " + e.getMessage())
            );
        }
    }
}
