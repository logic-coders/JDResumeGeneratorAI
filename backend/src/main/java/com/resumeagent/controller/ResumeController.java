package com.resumeagent.controller;

import com.resumeagent.domain.Resume;
import com.resumeagent.dto.GeneratedResumeItem;
import com.resumeagent.service.ResumeService;
import com.resumeagent.service.UserService;
import com.resumeagent.storage.FileStorageService;
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
    private final FileStorageService storageService;

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
     * Download the master resume as a PDF.
     */
    @GetMapping(value = "/master/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<org.springframework.core.io.Resource> getMasterResumePdf() {
        String userId = userService.getDefaultUserId();
        try {
            java.nio.file.Path pdfPath = java.nio.file.Paths.get(
                "./storage/users/" + userId + "/master/master_resume.pdf"
            );
            if (!java.nio.file.Files.exists(pdfPath)) {
                return ResponseEntity.notFound().build();
            }
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(pdfPath.toUri());
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"master_resume.pdf\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            log.error("Failed to load master resume PDF", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * List all generated resumes.
     */
    @GetMapping("/generated")
    public ResponseEntity<List<GeneratedResumeItem>> listGeneratedResumes() {
        String userId = userService.getDefaultUserId();
        return ResponseEntity.ok(resumeService.listGeneratedResumes(userId));
    }

    /**
     * Delete a generated resume by ID.
     */
    @DeleteMapping(value = {"/generated/{resumeId}", "/generated", "/{resumeId}"})
    public ResponseEntity<Map<String, Object>> deleteGeneratedResume(
            @PathVariable(required = false) String resumeId,
            @RequestParam(required = false) String id) {
        String userId = userService.getDefaultUserId();
        String targetId = (resumeId != null && !resumeId.isBlank()) ? resumeId : id;
        if (targetId == null || targetId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Resume ID must be provided"));
        }

        boolean deleted = resumeService.deleteGeneratedResume(userId, targetId);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", deleted ? "Resume deleted successfully" : "Resume already deleted",
                "resumeId", targetId
        ));
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
        
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(600000L); // 10 min timeout
        
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
     * Download or preview a generated PDF.
     * Supports resumeId as path variable (e.g. "Qualcomm__446720486356" or "job_xxx") or query param.
     */
    @GetMapping(value = {"/{resumeId}/pdf", "/download/pdf"})
    public ResponseEntity<org.springframework.core.io.Resource> getGeneratedResumePdf(
            @PathVariable(required = false) String resumeId,
            @RequestParam(required = false) String id) {
        String userId = userService.getDefaultUserId();
        String targetId = (resumeId != null && !resumeId.isBlank()) ? resumeId : id;
        if (targetId == null || targetId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            java.util.Optional<java.nio.file.Path> pdfPathOpt = storageService.findPdfPath(userId, targetId);
            if (pdfPathOpt.isEmpty() || !java.nio.file.Files.exists(pdfPathOpt.get())) {
                return ResponseEntity.notFound().build();
            }

            java.nio.file.Path pdfPath = pdfPathOpt.get();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(pdfPath.toUri());

            // Build friendly download filename, e.g. "Qualcomm_Resume.pdf"
            String filename = targetId.contains("__")
                    ? targetId.split("__")[0] + "_Resume.pdf"
                    : "resume_" + targetId + ".pdf";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            log.error("Failed to load PDF for {}: {}", targetId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Download or view generated LaTeX source (.tex).
     */
    @GetMapping(value = {"/{resumeId}/tex", "/download/tex"}, produces = org.springframework.http.MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getGeneratedResumeTex(
            @PathVariable(required = false) String resumeId,
            @RequestParam(required = false) String id) {
        String userId = userService.getDefaultUserId();
        String targetId = (resumeId != null && !resumeId.isBlank()) ? resumeId : id;
        if (targetId == null || targetId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            java.util.Optional<java.nio.file.Path> texPathOpt = storageService.findTexPath(userId, targetId);
            if (texPathOpt.isEmpty() || !java.nio.file.Files.exists(texPathOpt.get())) {
                return ResponseEntity.notFound().build();
            }

            String content = java.nio.file.Files.readString(texPathOpt.get());
            String filename = targetId.contains("__")
                    ? targetId.split("__")[0] + "_Resume.tex"
                    : "resume_" + targetId + ".tex";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(content);
        } catch (Exception e) {
            log.error("Failed to load TeX for {}: {}", targetId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
