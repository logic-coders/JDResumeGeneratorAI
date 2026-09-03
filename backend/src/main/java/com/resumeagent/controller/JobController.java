package com.resumeagent.controller;

import com.resumeagent.dto.AiServiceResponse;
import com.resumeagent.service.JobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for job extraction operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    /**
     * Extract a job description from a URL.
     */
    @PostMapping("/extract")
    public ResponseEntity<?> extractJob(@RequestBody Map<String, String> request) {
        String jobUrl = request.get("url");
        if (jobUrl == null || jobUrl.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Job URL is required")
            );
        }

        try {
            AiServiceResponse response = jobService.extractJob(jobUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Job extraction failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Failed to extract job: " + e.getMessage())
            );
        }
    }
}
