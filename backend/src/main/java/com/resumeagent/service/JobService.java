package com.resumeagent.service;

import com.resumeagent.dto.AiServiceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Service for extracting and processing job descriptions from URLs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final AiServiceClient aiServiceClient;

    /**
     * Fetch a job page URL, clean the content, and send to AI for structured parsing.
     */
    public AiServiceResponse extractJob(String jobUrl) throws IOException {
        log.info("Extracting job from URL: {}", jobUrl);

        // Fetch and clean the page content
        String cleanedContent = fetchAndCleanJobPage(jobUrl);
        log.info("Fetched {} characters from job URL", cleanedContent.length());

        // Send to AI service for structured parsing
        return aiServiceClient.parseJob(cleanedContent).block();
    }

    /**
     * Fetch a web page and extract clean text content.
     */
    public String fetchAndCleanJobPage(String url) throws IOException {
        Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
                .timeout(15000)
                .get();

        // Remove script, style, and nav elements
        doc.select("script, style, nav, header, footer, aside, .sidebar, .advertisement").remove();

        // Extract main content — try common job posting selectors
        String content = "";
        String[] selectors = {
                "[class*=job-description]",
                "[class*=jobDescription]",
                "[class*=job-detail]",
                "[class*=posting]",
                "[id*=job]",
                "main",
                "article",
                ".content",
                "body"
        };

        for (String selector : selectors) {
            var elements = doc.select(selector);
            if (!elements.isEmpty()) {
                content = elements.first().text();
                if (content.length() > 200) {
                    break;
                }
            }
        }

        // Fallback to body text
        if (content.length() < 200) {
            content = doc.body().text();
        }

        // Truncate very long content
        if (content.length() > 10000) {
            content = content.substring(0, 10000);
        }

        return content;
    }
}
