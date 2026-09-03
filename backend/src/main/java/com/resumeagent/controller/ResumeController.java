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
     * Generate custom resume for a job with SSE streaming progress
     */
    @GetMapping(value = "/stream-generate", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamGenerateResume(@RequestParam String jobUrl) {
        String userId = userService.getDefaultUserId();
        
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(300000L); // 5 min timeout
        
        new Thread(() -> {
            try {
                resumeService.generateCustomResumeStream(userId, jobUrl, emitter);
            } catch (Exception e) {
                log.error("Failed to generate resume stream", e);
                try {
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().name("error").data(e.getMessage()));
                    emitter.completeWithError(e);
                } catch (Exception ex) {}
            }
        }).start();
        
        return emitter;
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

    /**
     * Download or preview a generated PDF
     */
    @GetMapping("/{resumeId}/pdf")
    public ResponseEntity<org.springframework.core.io.Resource> getGeneratedResumePdf(@PathVariable String resumeId) {
        String userId = userService.getDefaultUserId();
        try {
            java.nio.file.Path pdfPath = java.nio.file.Paths.get(
                "./storage/users/" + userId + "/generated/" + resumeId + "/resume.pdf"
            );
            if (!java.nio.file.Files.exists(pdfPath)) {
                return ResponseEntity.notFound().build();
            }
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(pdfPath.toUri());
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resumeId + ".pdf\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            log.error("Failed to load PDF", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
