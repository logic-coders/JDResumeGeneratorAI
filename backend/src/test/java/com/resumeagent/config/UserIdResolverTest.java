package com.resumeagent.config;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

class UserIdResolverTest {

    private AppConfig appConfig;
    private UserIdResolver resolver;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        appConfig = new AppConfig();
        appConfig.setDefaultUserId("default_user");
        resolver = new UserIdResolver(appConfig);
        request = Mockito.mock(HttpServletRequest.class);
    }

    @Test
    void testResolveFromHeader() {
        when(request.getHeader("X-User-Id")).thenReturn("user_abc123");
        String resolved = resolver.resolve(request);
        assertEquals("user_abc123", resolved);
    }

    @Test
    void testResolveFromQueryParamForSse() {
        when(request.getHeader("X-User-Id")).thenReturn(null);
        when(request.getParameter("userId")).thenReturn("user_sse456");
        String resolved = resolver.resolve(request);
        assertEquals("user_sse456", resolved);
    }

    @Test
    void testFallbackToDefaultWhenBothMissing() {
        when(request.getHeader("X-User-Id")).thenReturn(null);
        when(request.getParameter("userId")).thenReturn(null);
        String resolved = resolver.resolve(request);
        assertEquals("default_user", resolved);
    }

    @Test
    void testFallbackWhenHeaderIsBlank() {
        when(request.getHeader("X-User-Id")).thenReturn("   ");
        when(request.getParameter("userId")).thenReturn(null);
        String resolved = resolver.resolve(request);
        assertEquals("default_user", resolved);
    }

    @Test
    void testSanitizationOfPathTraversal() {
        when(request.getHeader("X-User-Id")).thenReturn("../../etc/passwd");
        String resolved = resolver.resolve(request);
        assertEquals("etcpasswd", resolved);
    }

    @Test
    void testSanitizationCapsLength() {
        String longId = "a".repeat(100);
        when(request.getHeader("X-User-Id")).thenReturn(longId);
        String resolved = resolver.resolve(request);
        assertEquals(64, resolved.length());
    }
}
