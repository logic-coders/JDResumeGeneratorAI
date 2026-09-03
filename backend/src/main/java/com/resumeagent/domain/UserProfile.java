package com.resumeagent.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User's professional profile information.
 * Stored as profile.json in the user's storage directory.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfile {

    private String name;
    private String email;
    private String phone;
    private String location;

    // Professional links (all optional)
    private String linkedin;
    private String github;
    private String leetcode;
    private String portfolio;
    private String website;
}
