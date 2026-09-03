package com.resumeagent.service;

import com.resumeagent.config.AppConfig;
import com.resumeagent.domain.Resume;
import com.resumeagent.dto.AiServiceResponse;
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
     * List all generated resumes for a user.
     */
    public java.util.List<Map<String, String>> listGeneratedResumes(String userId) {
        String genDir = storageService.getGeneratedDir(userId);
        return storageService.listDirectories(genDir).stream()
                .map(dirName -> {
                    Map<String, String> info = new HashMap<>();
                    info.put("id", dirName);
                    info.put("name", dirName.replace("_", " "));
                    // Check if PDF exists
                    String pdfPath = genDir + "/" + dirName + "/resume.pdf";
                    info.put("hasPdf", String.valueOf(storageService.exists(pdfPath)));
                    return info;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    public Object analyzeResume(String userId, String jobUrl) throws IOException {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        // 1. Fetch and parse job
        org.jsoup.nodes.Document doc = org.jsoup.Jsoup.connect(jobUrl).get();
        String jobText = doc.body().text();
        AiServiceResponse jobResponse = aiServiceClient.parseJob(jobText).block();
        Object jobData = jobResponse.getData().get("parsedJob");
        
        // 2. Match
        AiServiceResponse matchResponse = aiServiceClient.matchResume(masterResume, jobData).block();
        return matchResponse.getData().get("matchReport");
    }

    public Object generateCustomResume(String userId, String jobUrl) throws IOException {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        // 1. Fetch and parse job
        org.jsoup.nodes.Document doc = org.jsoup.Jsoup.connect(jobUrl).get();
        String jobText = doc.body().text();
        AiServiceResponse jobResponse = aiServiceClient.parseJob(jobText).block();
        Object jobData = jobResponse.getData().get("parsedJob");
        
        // 2. Match
        AiServiceResponse matchResponse = aiServiceClient.matchResume(masterResume, jobData).block();
        Object matchReport = matchResponse.getData().get("matchReport");
        
        // 3. Optimize
        AiServiceResponse optimizeResponse = aiServiceClient.optimizeResume(masterResume, jobData, matchReport).block();
        Resume optimizedResume = new com.fasterxml.jackson.databind.ObjectMapper().convertValue(
            optimizeResponse.getData().get("optimizedResume"), Resume.class);
            
        // 4. Generate PDF
        String jobId = java.util.UUID.randomUUID().toString().substring(0, 8);
        String outputDir = storageService.getGeneratedDir(userId) + "/job_" + jobId;
        storageService.writeJson(outputDir + "/resume.json", optimizedResume);
        
        String texContent = latexTemplateRenderer.render(optimizedResume);
        pdfCompiler.compile(texContent, outputDir, "resume");
        
        Map<String, Object> result = new HashMap<>();
        result.put("resumeId", "job_" + jobId);
        result.put("resume", optimizedResume);
        return result;
    }

    public Object improveResume(String userId, String focusArea) {
        Resume masterResume = getMasterResume(userId).orElseThrow(() -> new RuntimeException("Master resume not found"));
        AiServiceResponse response = aiServiceClient.improveResume(masterResume, focusArea).block();
        return response.getData().get("improvements");
    }
}
