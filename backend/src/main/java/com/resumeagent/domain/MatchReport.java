package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Resume-to-job match analysis report.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MatchReport {

    private int overallMatchScore;

    @Builder.Default
    private List<String> strongMatches = new ArrayList<>();

    @Builder.Default
    private List<String> partialMatches = new ArrayList<>();

    @Builder.Default
    private List<String> missingSkills = new ArrayList<>();

    @Builder.Default
    private List<String> recommendations = new ArrayList<>();
}
