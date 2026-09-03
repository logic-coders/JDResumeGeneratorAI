package com.resumeagent.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppConfig {

    private String storagePath = "./storage";
    private String aiServiceUrl = "http://localhost:8000";
    private String latexCompiler = "pdflatex";
    private String defaultUserId = "user_001";

    /**
     * Returns the full storage path for a given user.
     */
    public String getUserStoragePath(String userId) {
        return storagePath + "/users/" + userId;
    }

    /**
     * Returns the full storage path for the default user.
     */
    public String getDefaultUserStoragePath() {
        return getUserStoragePath(defaultUserId);
    }
}
