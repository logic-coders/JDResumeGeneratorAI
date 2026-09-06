package com.resumeagent.service;

import com.resumeagent.dto.AiServiceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * Service for extracting and processing job descriptions from URLs.
 * Supports platform-specific selectors for major job boards.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final AiServiceClient aiServiceClient;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * Normalize job URLs (e.g. rewrite LinkedIn search/redirect URLs with currentJobId to canonical job view URLs).
     */
    public String normalizeUrl(String jobUrl) {
        if (jobUrl == null || jobUrl.isBlank()) {
            return jobUrl;
        }
        String trimmed = jobUrl.trim();
        // Rewrite LinkedIn search/collections/redirect URLs with currentJobId to public view URLs
        if (trimmed.toLowerCase().contains("linkedin.com") && trimmed.contains("currentJobId=")) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("currentJobId=(\\d+)").matcher(trimmed);
            if (matcher.find()) {
                String jobId = matcher.group(1);
                String canonicalUrl = "https://www.linkedin.com/jobs/view/" + jobId;
                log.info("Normalized LinkedIn URL from {} to {}", trimmed, canonicalUrl);
                return canonicalUrl;
            }
        }
        return trimmed;
    }

    /**
     * Fetch a job page URL, clean the content, and send to AI for structured parsing.
     */
    public AiServiceResponse extractJob(String jobUrl) throws IOException {
        String normalizedUrl = normalizeUrl(jobUrl);
        log.info("Extracting job from URL: {} (original: {})", normalizedUrl, jobUrl);

        // Validate URL
        validateUrl(normalizedUrl);

        // Fetch and clean the page content
        String cleanedContent = fetchAndCleanJobPage(normalizedUrl);
        log.info("Fetched {} characters from job URL", cleanedContent.length());

        if (cleanedContent.length() < 50) {
            throw new IOException("Job page content is too short — the page may require authentication or JavaScript rendering.");
        }

        // Send to AI service for structured parsing
        return aiServiceClient.parseJob(cleanedContent).block();
    }

    /**
     * Validate a job URL before attempting to scrape it.
     */
    private void validateUrl(String jobUrl) throws MalformedURLException {
        if (jobUrl == null || jobUrl.isBlank()) {
            throw new MalformedURLException("Job URL cannot be empty.");
        }
        try {
            URL url = new URL(jobUrl);
            String protocol = url.getProtocol();
            if (!"http".equals(protocol) && !"https".equals(protocol)) {
                throw new MalformedURLException("Only HTTP and HTTPS URLs are supported.");
            }
        } catch (MalformedURLException e) {
            throw new MalformedURLException("Invalid job URL: " + jobUrl + ". Please provide a valid URL starting with https://");
        }
    }

    /**
     * Fetch a web page and extract clean text content.
     * Uses platform-specific selectors for popular job boards.
     */
    public String fetchAndCleanJobPage(String url) throws IOException {
        String normalizedUrl = normalizeUrl(url);
        Document doc;
        try {
            doc = Jsoup.connect(normalizedUrl)
                    .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .referrer("https://www.google.com/")
                    .timeout(20000)
                    .followRedirects(true)
                    .maxBodySize(0)
                    .get();
        } catch (IOException e) {
            log.error("Failed to fetch URL {}: {}", normalizedUrl, e.getMessage());
            throw new IOException("Could not fetch the job page. The URL may be invalid, require authentication, or be blocking automated access. Error: " + e.getMessage());
        }

        // 1. First, try JSON-LD (schema.org/JobPosting) before removing script tags.
        // Used by Google Jobs, Eightfold (Qualcomm), Workday, Greenhouse, Lever, etc.
        String jsonLdContent = tryJsonLdExtraction(doc);
        if (jsonLdContent.length() >= 100) {
            log.info("Extracted {} characters from JSON-LD JobPosting", jsonLdContent.length());
            return truncate(jsonLdContent);
        }

        // Remove noise elements
        doc.select("script, style, nav, header, footer, aside, .sidebar, .advertisement, "
                + ".cookie-banner, .popup, .modal, #cookie-consent, .social-share, "
                + ".related-jobs, .similar-jobs, .recommendations, [aria-hidden=true]").remove();

        // 2. Try platform-specific selectors first (most specific → least specific)
        String content = tryPlatformSpecificExtraction(doc, normalizedUrl);

        // 3. If platform-specific didn't work, try generic job selectors
        if (content.length() < 100) {
            content = tryGenericJobSelectors(doc);
        }

        // 4. Try meta description tags (og:description, description)
        if (content.length() < 100) {
            content = tryMetaDescription(doc);
        }

        // 5. Fallback to main/article/body
        if (content.length() < 100) {
            content = tryFallbackSelectors(doc);
        }

        // 6. Final fallback to body text
        if (content.length() < 100) {
            content = doc.body() != null ? doc.body().text() : "";
        }

        return truncate(content.trim());
    }

    private String truncate(String text) {
        if (text != null && text.length() > 12000) {
            return text.substring(0, 12000).trim();
        }
        return text != null ? text.trim() : "";
    }

    /**
     * Extract structured JobPosting from schema.org JSON-LD if present.
     * Supported by modern ATS platforms (Eightfold, Qualcomm, Greenhouse, Workday, etc.).
     */
    private String tryJsonLdExtraction(Document doc) {
        var scripts = doc.select("script[type=application/ld+json]");
        for (var script : scripts) {
            String json = script.data();
            if (json == null || json.isBlank()) {
                json = script.html();
            }
            if (json.contains("JobPosting") && json.contains("description")) {
                try {
                    com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(json);
                    String result = parseJsonLdNode(root);
                    if (result != null && result.length() >= 100) {
                        return result;
                    }
                } catch (Exception e) {
                    log.debug("Failed to parse JSON-LD: {}", e.getMessage());
                }
            }
        }
        return "";
    }

    private String parseJsonLdNode(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null) return null;
        if (node.isArray()) {
            for (var item : node) {
                String res = parseJsonLdNode(item);
                if (res != null) return res;
            }
            return null;
        }
        if (node.has("@graph")) {
            return parseJsonLdNode(node.get("@graph"));
        }
        String type = node.path("@type").asText("");
        if ("JobPosting".equalsIgnoreCase(type)) {
            StringBuilder sb = new StringBuilder();
            if (node.has("title")) {
                sb.append("Job Title: ").append(node.path("title").asText()).append("\n\n");
            }
            if (node.has("hiringOrganization")) {
                String comp = node.path("hiringOrganization").path("name").asText("");
                if (!comp.isBlank()) {
                    sb.append("Company: ").append(comp).append("\n\n");
                }
            }
            if (node.has("description")) {
                String rawDesc = node.path("description").asText("");
                String cleanDesc = Jsoup.parse(rawDesc).text();
                sb.append("Job Description:\n").append(cleanDesc);
            }
            return sb.toString().trim();
        }
        return null;
    }

    /**
     * Try platform-specific selectors for major job boards, career portals, and ATS systems.
     */
    private String tryPlatformSpecificExtraction(Document doc, String url) {
        String lowUrl = url.toLowerCase();

        // 1. LinkedIn
        if (lowUrl.contains("linkedin.com")) {
            return extractFirst(doc,
                    ".description__text",
                    ".show-more-less-html__markup",
                    "[class*=description]",
                    ".core-section-container");
        }

        // 2. Indeed
        if (lowUrl.contains("indeed.com")) {
            return extractFirst(doc,
                    "#jobDescriptionText",
                    ".jobsearch-jobDescriptionText",
                    "[class*=jobDescription]");
        }

        // 3. Naukri
        if (lowUrl.contains("naukri.com")) {
            return extractFirst(doc,
                    ".styles_JDC__dang-inner-html__P0nPO",
                    ".job-desc-container",
                    ".dang-inner-html",
                    "[class*=job-desc]",
                    "[class*=jobDescription]");
        }

        // 4. Eightfold.ai (Qualcomm Careers, Micron, Capital One, etc.)
        if (lowUrl.contains("eightfold.ai") || lowUrl.contains("qualcomm.com")) {
            return extractFirst(doc,
                    "[class*=position-description]",
                    "[data-test-id*=job-description]",
                    "[data-ph-at-id=job-description-text]",
                    "[class*=job-description]",
                    ".job-description",
                    ".jd-info");
        }

        // 5. Foundit / Monster
        if (lowUrl.contains("foundit.in") || lowUrl.contains("monster.com")) {
            return extractFirst(doc,
                    ".job-desc",
                    ".jd-content",
                    "[class*=job-description]");
        }

        // 6. Internshala
        if (lowUrl.contains("internshala.com")) {
            return extractFirst(doc,
                    ".internship_details",
                    ".text-container",
                    "[class*=detail_view]",
                    "[class*=job_description]");
        }

        // 7. Greenhouse
        if (lowUrl.contains("greenhouse.io") || lowUrl.contains("boards.greenhouse")) {
            return extractFirst(doc,
                    "#content",
                    ".content",
                    "[class*=body]",
                    ".section");
        }

        // 8. Lever
        if (lowUrl.contains("lever.co") || lowUrl.contains("jobs.lever")) {
            return extractFirst(doc,
                    ".posting-page",
                    ".content",
                    "[class*=posting]");
        }

        // 9. Workday
        if (lowUrl.contains("myworkdayjobs.com") || lowUrl.contains("workday.com")) {
            return extractFirst(doc,
                    "[data-automation-id=jobPostingDescription]",
                    ".css-cygeeu",
                    "[class*=jobPostingDescription]",
                    "[class*=job-description]");
        }

        // 10. Glassdoor
        if (lowUrl.contains("glassdoor.com")) {
            return extractFirst(doc,
                    ".jobDescriptionContent",
                    "[class*=JobDesc]",
                    "[class*=description]");
        }

        // 11. SmartRecruiters
        if (lowUrl.contains("smartrecruiters.com")) {
            return extractFirst(doc,
                    ".job-sections",
                    "[itemprop=description]",
                    ".job-detail",
                    "[class*=job-sections]");
        }

        // 12. Ashby
        if (lowUrl.contains("ashbyhq.com")) {
            return extractFirst(doc,
                    "[class*=job-description]",
                    ".ashby-job-posting-description",
                    "[class*=ashby]",
                    "[data-testid*=job-description]");
        }

        // 13. Taleo / Oracle Cloud
        if (lowUrl.contains("taleo.net") || lowUrl.contains("oraclecloud.com")) {
            return extractFirst(doc,
                    ".mastercontentclass",
                    ".contentpane",
                    "[id*=requisitionDescription]",
                    "[class*=requisition-description]");
        }

        // 14. iCIMS
        if (lowUrl.contains("icims.com")) {
            return extractFirst(doc,
                    ".iCIMS_JobContent",
                    ".job-details",
                    "[class*=iCIMS_JobContent]");
        }

        // 15. BambooHR
        if (lowUrl.contains("bamboohr.com")) {
            return extractFirst(doc,
                    ".BambooHR-ATS-Jobs-Item",
                    "[class*=BambooHR]",
                    ".pos-description");
        }

        // 16. Wellfound / AngelList
        if (lowUrl.contains("wellfound.com") || lowUrl.contains("angel.co")) {
            return extractFirst(doc,
                    "[class*=styles_jobDescription]",
                    "[class*=styles_description]",
                    "[data-test=JobDescription]");
        }

        // 17. ZipRecruiter
        if (lowUrl.contains("ziprecruiter.com")) {
            return extractFirst(doc,
                    ".job_description",
                    ".jobDescriptionSection",
                    "[class*=job_description]");
        }

        // 18. Dice
        if (lowUrl.contains("dice.com")) {
            return extractFirst(doc,
                    "[data-cy=jobDescription]",
                    "#jobDescription",
                    ".job-description");
        }

        // 19. Jobvite
        if (lowUrl.contains("jobvite.com")) {
            return extractFirst(doc,
                    ".jv-job-detail-description",
                    "[class*=jv-job-detail]");
        }

        // 20. Breezy HR
        if (lowUrl.contains("breezy.hr")) {
            return extractFirst(doc,
                    ".description",
                    "[class*=description]",
                    ".position-description");
        }

        // 21. SAP SuccessFactors
        if (lowUrl.contains("successfactors.com") || lowUrl.contains("sap.com")) {
            return extractFirst(doc,
                    ".job-description",
                    "[class*=jobdescription]",
                    ".joqReqDescription");
        }

        // 22. Handshake
        if (lowUrl.contains("joinhandshake.com")) {
            return extractFirst(doc,
                    "[class*=job-description]",
                    "[class*=description]");
        }

        // 23. Y Combinator / Work at a Startup
        if (lowUrl.contains("workatastartup.com")) {
            return extractFirst(doc,
                    "[class*=job-description]",
                    "[class*=description]");
        }

        return "";
    }

    /**
     * Try extracting from meta tags (og:description, description) if DOM elements were empty.
     */
    private String tryMetaDescription(Document doc) {
        var ogDesc = doc.select("meta[property=og:description], meta[name=twitter:description], meta[name=description]");
        for (var el : ogDesc) {
            String content = el.attr("content");
            if (content != null && content.length() > 100) {
                return content.trim();
            }
        }
        return "";
    }

    /**
     * Try generic CSS selectors commonly used for job descriptions.
     */
    private String tryGenericJobSelectors(Document doc) {
        return extractFirst(doc,
                "[class*=job-description]",
                "[class*=jobDescription]",
                "[class*=job-detail]",
                "[class*=job_description]",
                "[class*=posting-description]",
                "[class*=posting]",
                "[id*=job-description]",
                "[id*=jobDescription]",
                "[id*=job]"
        );
    }

    /**
     * Try broad fallback selectors.
     */
    private String tryFallbackSelectors(Document doc) {
        return extractFirst(doc, "main", "article", ".content", "#content", "[role=main]");
    }

    /**
     * Try multiple CSS selectors and return the first one with meaningful content.
     */
    private String extractFirst(Document doc, String... selectors) {
        for (String selector : selectors) {
            var elements = doc.select(selector);
            if (!elements.isEmpty()) {
                String text = elements.first().text();
                if (text.length() > 100) {
                    return text;
                }
            }
        }
        return "";
    }
}

