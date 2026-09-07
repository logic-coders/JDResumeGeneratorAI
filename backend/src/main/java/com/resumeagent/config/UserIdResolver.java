package com.resumeagent.config;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Resolves the current userId from the X-User-Id request header,
 * falling back to AppConfig.defaultUserId for local / single-user dev.
 *
 * Thread-safe: stateless, one instance shared by all controllers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserIdResolver {

    private static final String HEADER_NAME = "X-User-Id";

    private final AppConfig appConfig;

    /**
     * Extract userId from the request header, query parameter, or fall back to default.
     * Query parameter fallback is needed for EventSource (SSE) which cannot set custom headers.
     */
    public String resolve(HttpServletRequest request) {
        String headerValue = request.getHeader(HEADER_NAME);
        if (headerValue != null && !headerValue.isBlank()) {
            String userId = sanitize(headerValue);
            log.debug("Resolved userId from header: {}", userId);
            return userId;
        }
        // Fallback: check query parameter (for SSE EventSource which can't set headers)
        String paramValue = request.getParameter("userId");
        if (paramValue != null && !paramValue.isBlank()) {
            String userId = sanitize(paramValue);
            log.debug("Resolved userId from query param: {}", userId);
            return userId;
        }
        return appConfig.getDefaultUserId();
    }

    /**
     * Sanitize the raw header value to prevent path-traversal attacks
     * and keep folder names filesystem-safe.
     */
    private String sanitize(String raw) {
        // Strip path separators, dots-leading, and non-alphanum/underscore/hyphen chars
        String cleaned = raw.strip()
                .replaceAll("[/\\\\]", "")
                .replaceAll("^\\.+", "")
                .replaceAll("[^a-zA-Z0-9_\\-]", "_");
        if (cleaned.isBlank()) {
            return appConfig.getDefaultUserId();
        }
        // Cap length to prevent absurdly long directory names
        if (cleaned.length() > 64) {
            cleaned = cleaned.substring(0, 64);
        }
        return cleaned;
    }
}
