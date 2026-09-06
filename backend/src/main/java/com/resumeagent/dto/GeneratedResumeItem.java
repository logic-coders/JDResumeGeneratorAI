package com.resumeagent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data transfer object for stored generated resumes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeneratedResumeItem {
    private String resumeId;
    private String company;
    private String jobTitle;
    private String jobId;
    private String jobUrl;
    private String folderPath;
    private boolean hasPdf;
    private boolean hasTex;
    private boolean hasJson;
    private String generatedAt;
    private String updatedAt;
    private int version;
    private Integer matchScore;

    public String getId() {
        return resumeId;
    }

    public String getName() {
        return (company != null ? company : "") + " - " + (jobTitle != null ? jobTitle : "");
    }
}
