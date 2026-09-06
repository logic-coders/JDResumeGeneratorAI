package com.resumeagent.service;

import com.resumeagent.config.AppConfig;
import com.resumeagent.domain.Resume;
import com.resumeagent.dto.AiServiceResponse;
import com.resumeagent.dto.GeneratedResumeItem;
import com.resumeagent.latex.LatexTemplateRenderer;
import com.resumeagent.latex.PdfCompiler;
import com.resumeagent.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Service for resume processing: PDF extraction, parsing, LaTeX generation, and PDF compilation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeService {

    private final FileStorageService storageService;
    private final AiServiceClient aiServiceClient;
    private final AppConfig appConfig;
    private final LatexTemplateRenderer latexTemplateRenderer;
    private final PdfCompiler pdfCompiler;
    private final JobService jobService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * Process an uploaded resume PDF:
     * 1. Save the original PDF
     * 2. Extract text from PDF
     * 3. Send to AI service for structured parsing
     * 4. Return extracted text and parsed data for user review
     */
    public Map<String, Object> processUploadedResume(String userId, MultipartFile file) throws IOException {
        // Save original PDF
        String originalPath = storageService.getOriginalResumePath(userId);
        storageService.writeBytes(originalPath, file.getBytes());
        log.info("Original resume saved: {}", originalPath);

        // Extract text from PDF
        String extractedText = extractTextFromPdf(file.getBytes());
        log.info("Extracted {} characters from resume PDF", extractedText.length());

        // Send to AI service for parsing
        AiServiceResponse parseResponse;
        try {
            parseResponse = aiServiceClient.parseResume(extractedText).block();
        } catch (Exception e) {
            log.error("AI resume parsing failed: {}", e.getMessage());
            parseResponse = null;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("extractedText", extractedText);
        result.put("originalPath", originalPath);

        if (parseResponse != null && parseResponse.getData() != null) {
            result.put("parsedResume", parseResponse.getData());
            try {
                java.util.Map<String, Object> data = (java.util.Map<String, Object>) parseResponse.getData();
                if (data.containsKey("parsedResume")) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Resume parsed = mapper.convertValue(data.get("parsedResume"), Resume.class);
                    saveMasterResume(userId, parsed);
                } else if (data.containsKey("personalInfo")) {
                    // Fallback in case it's returned directly
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Resume parsed = mapper.convertValue(data, Resume.class);
                    saveMasterResume(userId, parsed);
                }
            } catch (Exception e) {
                log.error("Failed to save master resume during upload: {}", e.getMessage());
            }
        }

        return result;
    }

    /**
     * Extract text content from a PDF byte array using Apache PDFBox.
     */
    public String extractTextFromPdf(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Get master resume data.
     */
    public Optional<Resume> getMasterResume(String userId) {
        return storageService.readJson(
                storageService.getMasterResumePath(userId),
                Resume.class
        );
    }

    /**
     * Save master resume data and generate LaTeX + PDF.
     */
    public void saveMasterResume(String userId, Resume resume) {
        // Save JSON
        storageService.writeJson(storageService.getMasterResumePath(userId), resume);
        log.info("Master resume JSON saved for user: {}", userId);

        try {
            // Generate LaTeX and compile PDF (Phase 3)
            String texContent = latexTemplateRenderer.render(resume);
            String outputDir = appConfig.getUserStoragePath(userId) + "/master";
            pdfCompiler.compile(texContent, outputDir, "master_resume");
        } catch (Exception e) {
            log.error("Failed to compile master resume PDF: {}", e.getMessage(), e);
        }
    }

    /**
     * List all generated resumes for a user, sorted latest first.
     */
    public java.util.List<GeneratedResumeItem> listGeneratedResumes(String userId) {
        return storageService.listGeneratedResumeItems(userId);
    }

    /**
     * Delete a generated resume for a user.
     */
    public boolean deleteGeneratedResume(String userId, String resumeId) {
        return storageService.deleteGeneratedResume(userId, resumeId);
    }

    public Object analyzeResume(String userId, String jobUrl) throws IOException {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        // 1. Fetch and parse job using hardened JobService
        String jobText = jobService.fetchAndCleanJobPage(jobUrl);
        AiServiceResponse jobResponse = aiServiceClient.parseJob(jobText).block();
        Object jobData = jobResponse.getData().get("parsedJob");
        
        // 2. Match
        AiServiceResponse matchResponse = aiServiceClient.matchResume(masterResume, jobData).block();
        return matchResponse.getData().get("matchReport");
    }

    public Object generateCustomResume(String userId, String jobUrl) throws IOException {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        // 1. Fetch and parse job using hardened JobService
        String jobText = jobService.fetchAndCleanJobPage(jobUrl);
        AiServiceResponse jobResponse = aiServiceClient.parseJob(jobText).block();
        Object jobData = jobResponse.getData().get("parsedJob");
        
        // 2. Match
        AiServiceResponse matchResponse = aiServiceClient.matchResume(masterResume, jobData).block();
        Object matchReport = matchResponse.getData().get("matchReport");
        
        // 3. Optimize
        AiServiceResponse optimizeResponse = aiServiceClient.optimizeResume(masterResume, jobData, matchReport).block();
        Resume optimizedResume = objectMapper.convertValue(
            optimizeResponse.getData().get("optimizedResume"), Resume.class);
            
        // 4. Save and compile company-wise resume package
        return saveAndCompileCustomResume(userId, jobUrl, optimizedResume, jobData, matchReport);
    }

    public void generateCustomResumeStream(String userId, String jobUrl, org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter) throws IOException {
        try {
            Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
            
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 10, "message", "Fetching and cleaning job description from " + jobUrl)));
            
            // 1. Fetch and parse job using hardened JobService
            String jobText = jobService.fetchAndCleanJobPage(jobUrl);
            
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 25, "message", "Found JD. Sending to AI for structured parsing...")));
            AiServiceResponse jobResponse = aiServiceClient.parseJob(jobText).block();
            Object jobData = jobResponse.getData().get("parsedJob");
            
            // 2. Match
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 40, "message", "Analyzing master resume against job requirements...")));
            AiServiceResponse matchResponse = aiServiceClient.matchResume(masterResume, jobData).block();
            Object matchReport = matchResponse.getData().get("matchReport");
            
            // 3. Optimize
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 60, "message", "Optimizing resume. Injecting JD-specific skills and tailoring summary...")));
            AiServiceResponse optimizeResponse = aiServiceClient.optimizeResume(masterResume, jobData, matchReport).block();
            Resume optimizedResume = objectMapper.convertValue(
                optimizeResponse.getData().get("optimizedResume"), Resume.class);
                
            // 4. Save and compile company-wise resume package
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 85, "message", "Compiling LaTeX template into PDF format...")));
            Map<String, Object> result = saveAndCompileCustomResume(userId, jobUrl, optimizedResume, jobData, matchReport);
            
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "log", "progress", 100, "message", "Generation complete! Saved to " + result.get("folderPath"))));
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "result", "data", result)));
            emitter.complete();
        } catch (Exception e) {
            log.error("Streaming generation failed", e);
            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event().data(Map.of("type", "error", "message", e.getMessage())));
                emitter.completeWithError(e);
            } catch (Exception ex) {}
        }
    }

    /**
     * Save generated resume files into company-wise folders, deduplicate same job IDs,
     * and compile LaTeX to PDF.
     */
    private Map<String, Object> saveAndCompileCustomResume(
            String userId,
            String jobUrl,
            Resume optimizedResume,
            Object jobData,
            Object matchReport) {

        String company = extractCompany(jobData, jobUrl);
        String jobTitle = extractJobTitle(jobData);
        String jobId = extractJobId(jobData, jobUrl);

        Integer matchScore = null;
        if (matchReport instanceof Map<?, ?> mr && mr.containsKey("matchScore")) {
            try {
                matchScore = Integer.parseInt(mr.get("matchScore").toString());
            } catch (Exception ignored) {}
        }

        String texContent = latexTemplateRenderer.render(optimizedResume);

        // 1. Save JSON, TeX, metadata to user storage and workspace root
        GeneratedResumeItem item = storageService.saveGeneratedResumePackage(
                userId, company, jobTitle, jobId, jobUrl, optimizedResume, jobData, texContent, matchScore
        );

        // 2. Compile PDF directly into user directory
        String relativeFolder = item.getFolderPath().replace("Generated Resumes/", "");
        String userFolder = storageService.getUserGeneratedResumesDir(userId) + "/" + relativeFolder;
        String workspaceFolder = storageService.getProjectWorkspaceGeneratedResumesDir() + "/" + relativeFolder;

        pdfCompiler.compile(texContent, userFolder, "resume");

        // 3. Mirror compiled PDF to workspace root "Generated Resumes"
        storageService.copyFile(userFolder + "/resume.pdf", workspaceFolder + "/resume.pdf");

        // 4. Also mirror to legacy folder so existing URLs continue to work
        String legacyDir = storageService.getGeneratedDir(userId) + "/job_" + item.getJobId();
        storageService.createDirectories(legacyDir);
        storageService.copyFile(userFolder + "/resume.pdf", legacyDir + "/resume.pdf");
        storageService.copyFile(userFolder + "/resume.json", legacyDir + "/resume.json");
        storageService.copyFile(userFolder + "/resume.tex", legacyDir + "/resume.tex");

        Map<String, Object> result = new HashMap<>();
        result.put("resumeId", item.getResumeId());
        result.put("company", item.getCompany());
        result.put("jobTitle", item.getJobTitle());
        result.put("jobId", item.getJobId());
        result.put("folderPath", item.getFolderPath());
        result.put("version", item.getVersion());
        result.put("updatedAt", item.getUpdatedAt());
        result.put("resume", optimizedResume);
        return result;
    }

    private String extractCompany(Object jobData, String jobUrl) {
        if (jobData instanceof Map<?, ?> map) {
            Object comp = map.get("company");
            if (comp == null || comp.toString().isBlank()) {
                comp = map.get("companyName");
            }
            if (comp != null && !comp.toString().isBlank() && !"Unknown".equalsIgnoreCase(comp.toString())) {
                return comp.toString().trim();
            }
        }
        try {
            java.net.URI uri = java.net.URI.create(jobUrl);
            String host = uri.getHost();
            if (host != null) {
                host = host.replaceFirst("^www\\.", "");
                String[] parts = host.split("\\.");
                if (parts.length > 0 && !parts[0].isBlank()) {
                    String name = parts[0];
                    return Character.toUpperCase(name.charAt(0)) + name.substring(1);
                }
            }
        } catch (Exception ignored) {}
        return "General";
    }

    private String extractJobTitle(Object jobData) {
        if (jobData instanceof Map<?, ?> map) {
            Object title = map.get("jobTitle");
            if (title == null || title.toString().isBlank()) {
                title = map.get("title");
            }
            if (title != null && !title.toString().isBlank()) {
                return title.toString().trim();
            }
        }
        return "Software_Engineer";
    }

    private String extractJobId(Object jobData, String jobUrl) {
        if (jobData instanceof Map<?, ?> map) {
            Object jId = map.get("jobId");
            if (jId != null && !jId.toString().isBlank()) {
                return jId.toString().trim();
            }
        }

        if (jobUrl != null) {
            // LinkedIn: currentJobId=12345 or /jobs/view/12345
            var matcher = java.util.regex.Pattern.compile("(?:currentJobId=|/jobs/view/)(\\d+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Eightfold: pid=12345
            matcher = java.util.regex.Pattern.compile("pid=([a-zA-Z0-9]+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Greenhouse: /jobs/12345 or gh_jid=12345
            matcher = java.util.regex.Pattern.compile("(?:/jobs/|gh_jid=)(\\d+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Lever: /jobs.lever.co/[^/]+/([a-f0-9\\-]+)
            matcher = java.util.regex.Pattern.compile("lever\\.co/[^/]+/([a-f0-9\\-]+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Workday: /job/[^/]+/([A-Za-z0-9_\\-]+)
            matcher = java.util.regex.Pattern.compile("/job/[^/]+/([A-Za-z0-9_\\-]+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Indeed: jk=([a-f0-9]+)
            matcher = java.util.regex.Pattern.compile("jk=([a-f0-9]+)").matcher(jobUrl);
            if (matcher.find()) return matcher.group(1);

            // Deterministic hash of normalized URL
            String norm = jobService.normalizeUrl(jobUrl).toLowerCase();
            return String.format("%08x", norm.hashCode());
        }

        return java.util.UUID.randomUUID().toString().substring(0, 8);
    }

    public Object improveResume(String userId, String focusArea) {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        AiServiceResponse response = aiServiceClient.improveResume(masterResume, focusArea).block();
        return response.getData().get("improvements");
    }
}
