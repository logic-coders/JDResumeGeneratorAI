package com.resumeagent.controller;

import com.resumeagent.domain.Resume;
import com.resumeagent.service.ResumeService;
import com.resumeagent.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for resume operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;
    private final UserService userService;

    /**
     * Get the master resume data.
     */
    @GetMapping("/master")
    public ResponseEntity<Resume> getMasterResume() {
        String userId = userService.getDefaultUserId();
        return resumeService.getMasterResume(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List all generated resumes.
     */
    @GetMapping("/generated")
    public ResponseEntity<List<Map<String, String>>> listGeneratedResumes() {
        String userId = userService.getDefaultUserId();
        return ResponseEntity.ok(resumeService.listGeneratedResumes(userId));
    }

    /**
     * Save/update master resume data.
     */
    @PutMapping("/master")
    public ResponseEntity<Void> saveMasterResume(@RequestBody Resume resume) {
        String userId = userService.getDefaultUserId();
        resumeService.saveMasterResume(userId, resume);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Generate custom resume for a job
     */
    @PostMapping("/generate")
    public ResponseEntity<Object> generateResume(@RequestBody Map<String, Object> request) {
        String userId = userService.getDefaultUserId();
        try {
            return ResponseEntity.ok(resumeService.generateCustomResume(userId, request.get("jobUrl").toString()));
        } catch (Exception e) {
            log.error("Failed to generate resume", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Analyze master resume against a job
     */
    @PostMapping("/analyze")
    public ResponseEntity<Object> analyzeResume(@RequestBody Map<String, Object> request) {
        String userId = userService.getDefaultUserId();
        try {
            return ResponseEntity.ok(resumeService.analyzeResume(userId, request.get("jobUrl").toString()));
        } catch (Exception e) {
            log.error("Failed to analyze resume", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Improve master resume
     */
    @PostMapping("/improve")
    public ResponseEntity<Object> improveResume(@RequestBody Map<String, Object> request) {
        String userId = userService.getDefaultUserId();
        try {
            String focusArea = request.containsKey("focusArea") ? request.get("focusArea").toString() : "overall";
            return ResponseEntity.ok(resumeService.improveResume(userId, focusArea));
        } catch (Exception e) {
            log.error("Failed to improve resume", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
