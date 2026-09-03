package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured job description data extracted from a job URL.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Job {

    private String jobId;
    private String company;
    private String jobTitle;
    private String location;
    private String description;

    @Builder.Default
    private List<String> responsibilities = new ArrayList<>();

    @Builder.Default
    private List<String> requiredSkills = new ArrayList<>();

    @Builder.Default
    private List<String> preferredSkills = new ArrayList<>();

    private String minimumExperience;

    @Builder.Default
    private List<String> educationRequirements = new ArrayList<>();

    private String sourceUrl;
}
