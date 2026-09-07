package com.resumeagent.controller;

import com.resumeagent.config.UserIdResolver;
import com.resumeagent.domain.OnboardingState;
import com.resumeagent.domain.Resume;
import com.resumeagent.domain.UserProfile;
import com.resumeagent.service.ResumeService;
import com.resumeagent.service.UserService;
import com.resumeagent.storage.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST controller for user profile, onboarding, and resume-data CRUD operations.
 * userId is resolved from the X-User-Id request header (multi-user support).
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ResumeService resumeService;
    private final UserIdResolver userIdResolver;
    private final FileStorageService storageService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    // ─── Profile ─────────────────────────────────────────────────────

    /**
     * Get current user profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfile> getProfile(HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        return userService.getProfile(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update user profile.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfile> updateProfile(
            @RequestBody UserProfile profile,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        storageService.ensureUserDirectories(userId);
        UserProfile saved = userService.saveProfile(userId, profile);
        return ResponseEntity.ok(saved);
    }

    // ─── Onboarding ──────────────────────────────────────────────────

    /**
     * Get onboarding status.
     */
    @GetMapping("/onboarding/status")
    public ResponseEntity<OnboardingState> getOnboardingStatus(HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        OnboardingState state = userService.getOnboardingState(userId);
        return ResponseEntity.ok(state);
    }

    // ─── Resume Upload ───────────────────────────────────────────────

    /**
     * Upload a resume PDF.
     */
    @PostMapping("/resume/upload")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        storageService.ensureUserDirectories(userId);
        log.info("Resume upload received from user {}: {} ({} bytes)",
                userId, file.getOriginalFilename(), file.getSize());

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

    // ─── Resume Data CRUD (§16.1 — Editable Profile) ────────────────

    /**
     * Get full resume data (experience, projects, skills, education, certifications, achievements).
     */
    @GetMapping("/resume-data")
    public ResponseEntity<Resume> getResumeData(HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        return resumeService.getMasterResume(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Replace entire resume data.
     */
    @PutMapping("/resume-data")
    public ResponseEntity<Resume> updateResumeData(
            @RequestBody Resume resume,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        storageService.ensureUserDirectories(userId);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch experience entries (add/update/replace the list).
     */
    @PatchMapping("/resume-data/experience")
    public ResponseEntity<Resume> patchExperience(
            @RequestBody List<Resume.Experience> experience,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setExperience(experience);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch project entries.
     */
    @PatchMapping("/resume-data/projects")
    public ResponseEntity<Resume> patchProjects(
            @RequestBody List<Resume.Project> projects,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setProjects(projects);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch skills object.
     */
    @PatchMapping("/resume-data/skills")
    public ResponseEntity<Resume> patchSkills(
            @RequestBody Resume.Skills skills,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setSkills(skills);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch education entries.
     */
    @PatchMapping("/resume-data/education")
    public ResponseEntity<Resume> patchEducation(
            @RequestBody List<Resume.Education> education,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setEducation(education);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch certifications list.
     */
    @PatchMapping("/resume-data/certifications")
    public ResponseEntity<Resume> patchCertifications(
            @RequestBody List<String> certifications,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setCertifications(certifications);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }

    /**
     * Patch achievements list.
     */
    @PatchMapping("/resume-data/achievements")
    public ResponseEntity<Resume> patchAchievements(
            @RequestBody List<String> achievements,
            HttpServletRequest httpRequest) {
        String userId = userIdResolver.resolve(httpRequest);
        Resume resume = resumeService.getMasterResume(userId).orElse(new Resume());
        resume.setAchievements(achievements);
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok(resume);
    }
}
