package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured resume data — the primary source of truth for resume generation.
 * Stored as resume_data.json (master) or resume_data.json (generated).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Resume {

    private PersonalInfo personalInfo;
    private String summary;
    private Skills skills;

    @Builder.Default
    private List<Experience> experience = new ArrayList<>();

    @Builder.Default
    private List<Project> projects = new ArrayList<>();

    @Builder.Default
    private List<Education> education = new ArrayList<>();

    @Builder.Default
    private List<String> certifications = new ArrayList<>();

    @Builder.Default
    private List<String> achievements = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalInfo {
        private String name;
        private String email;
        private String phone;
        private String location;
        private String linkedin;
        private String github;
        private String leetcode;
        private String portfolio;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Skills {
        @Builder.Default
        private List<String> languages = new ArrayList<>();
        @Builder.Default
        private List<String> frameworks = new ArrayList<>();
        @Builder.Default
        private List<String> databases = new ArrayList<>();
        @Builder.Default
        private List<String> cloud = new ArrayList<>();
        @Builder.Default
        private List<String> tools = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Experience {
        private String company;
        private String title;
        private String location;
        private String startDate;
        private String endDate;
        @Builder.Default
        private List<String> bullets = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Project {
        private String name;
        private String technologies;
        private String url;
        @Builder.Default
        private List<String> bullets = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Education {
        private String institution;
        private String degree;
        private String field;
        private String startDate;
        private String endDate;
        private String gpa;
    }
}
