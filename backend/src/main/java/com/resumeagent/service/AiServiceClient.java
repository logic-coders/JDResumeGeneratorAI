package com.resumeagent.service;

import com.resumeagent.config.AppConfig;
import com.resumeagent.dto.AiServiceRequest;
import com.resumeagent.dto.AiServiceResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * HTTP client for communicating with the Python AI service.
 * All LLM/agent logic is delegated to the AI service.
 */
@Slf4j
@Service
public class AiServiceClient {

    private final WebClient webClient;

    public AiServiceClient(AppConfig appConfig) {
        this.webClient = WebClient.builder()
                .baseUrl(appConfig.getAiServiceUrl())
                .build();
    }

    /**
     * Send a chat message to the AI service and get a complete response.
     */
    public Mono<AiServiceResponse> chat(AiServiceRequest request) {
        log.debug("Sending chat request to AI service: {}", request.getMessage());
        return webClient.post()
                .uri("/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(AiServiceResponse.class)
                .doOnError(e -> log.error("AI service chat error: {}", e.getMessage()));
    }

    /**
     * Stream a chat response from the AI service via SSE.
     */
    public Flux<String> chatStream(AiServiceRequest request) {
        log.debug("Streaming chat request to AI service: {}", request.getMessage());
        return webClient.post()
                .uri("/ai/chat/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnError(e -> log.error("AI service stream error: {}", e.getMessage()));
    }

    /**
     * Parse resume text into structured JSON.
     */
    public Mono<AiServiceResponse> parseResume(String resumeText) {
        log.debug("Sending resume text to AI service for parsing");
        return webClient.post()
                .uri("/ai/parse-resume")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of("resumeText", resumeText))
                .retrieve()
                .bodyToMono(AiServiceResponse.class);
    }

    /**
     * Parse job description text into structured JSON.
     */
    public Mono<AiServiceResponse> parseJob(String jobText) {
        log.debug("Sending job text to AI service for parsing");
        return webClient.post()
                .uri("/ai/parse-job")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of("jobText", jobText))
                .retrieve()
                .bodyToMono(AiServiceResponse.class);
    }

    /**
     * Match resume against job description.
     */
    public Mono<AiServiceResponse> matchResume(Object resume, Object job) {
        log.debug("Sending resume and job to AI service for matching");
        return webClient.post()
                .uri("/ai/match-resume")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of("resume", resume, "job", job))
                .retrieve()
                .bodyToMono(AiServiceResponse.class);
    }

    /**
     * Optimize resume for a specific job.
     */
    public Mono<AiServiceResponse> optimizeResume(Object masterResume, Object job, Object matchReport) {
        log.debug("Sending resume optimization request to AI service");
        return webClient.post()
                .uri("/ai/optimize-resume")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of(
                        "masterResume", masterResume,
                        "job", job,
                        "matchReport", matchReport
                ))
                .retrieve()
                .bodyToMono(AiServiceResponse.class);
    }

    /**
     * Improve master resume.
     */
    public Mono<AiServiceResponse> improveResume(Object masterResume, String focusArea) {
        log.debug("Sending resume improvement request to AI service");
        return webClient.post()
                .uri("/ai/improve-resume")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of(
                        "masterResume", masterResume,
                        "focusArea", focusArea != null ? focusArea : "overall"
                ))
                .retrieve()
                .bodyToMono(AiServiceResponse.class);
    }

    /**
     * Health check for the AI service.
     */
    public Mono<Boolean> healthCheck() {
        return webClient.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(String.class)
                .map(r -> true)
                .onErrorReturn(false);
    }
}
