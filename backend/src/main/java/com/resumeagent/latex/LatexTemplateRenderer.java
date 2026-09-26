package com.resumeagent.latex;

import com.resumeagent.domain.Resume;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Renders a Resume domain object into a complete LaTeX document using a template.
 */
@Slf4j
@Component
public class LatexTemplateRenderer {

    private final String templateContent;

    public LatexTemplateRenderer() {
        try {
            this.templateContent = new String(
                    new ClassPathResource("templates/resume_template.tex").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8
            );
        } catch (IOException e) {
            log.error("Failed to load LaTeX template", e);
            throw new RuntimeException("Could not load LaTeX template", e);
        }
    }

    public String render(Resume resume) {
        String tex = templateContent;

        // Basic Info
        if (resume.getPersonalInfo() != null) {
            String name = resume.getPersonalInfo().getName();
            tex = tex.replace("<<NAME>>", (name == null || name.isBlank()) ? "~" : escapeLatex(name));
            String loc = resume.getPersonalInfo().getLocation();
            if (loc != null && !loc.isBlank()) {
                tex = tex.replace("<<LOCATION_BLOCK>>", escapeLatex(loc) + " \\\\ \\vspace{5pt}");
            } else {
                tex = tex.replace("<<LOCATION_BLOCK>>", "");
            }
            
            tex = tex.replace("<<PHONE>>", escapeLatex(resume.getPersonalInfo().getPhone()));
            tex = tex.replace("<<EMAIL>>", escapeLatex(resume.getPersonalInfo().getEmail()));

            // Links
            tex = tex.replace("<<LINKEDIN>>", formatLink(resume.getPersonalInfo().getLinkedin(), "LinkedIn", "\\faLinkedin"));
            tex = tex.replace("<<GITHUB>>", formatLink(resume.getPersonalInfo().getGithub(), "GitHub", "\\faGithub"));
            tex = tex.replace("<<PORTFOLIO>>", formatLink(resume.getPersonalInfo().getPortfolio(), "Portfolio", "\\faGlobe"));
        } else {
            tex = tex.replace("<<NAME>>", "~").replace("<<LOCATION_BLOCK>>", "").replace("<<PHONE>>", "").replace("<<EMAIL>>", "");
            tex = tex.replace("<<LINKEDIN>>", "").replace("<<GITHUB>>", "").replace("<<PORTFOLIO>>", "");
        }

        // Sections
        tex = tex.replace("<<SUMMARY_SECTION>>", renderSummary(resume.getSummary()));
        tex = tex.replace("<<EXPERIENCE_SECTION>>", renderExperience(resume.getExperience()));
        tex = tex.replace("<<PROJECTS_SECTION>>", renderProjects(resume.getProjects()));
        tex = tex.replace("<<SKILLS_SECTION>>", renderSkills(resume.getSkills()));
        tex = tex.replace("<<ACHIEVEMENTS_SECTION>>", renderAchievements(resume.getAchievements()));
        tex = tex.replace("<<CERTIFICATIONS_SECTION>>", renderCertifications(resume.getCertifications()));
        tex = tex.replace("<<EDUCATION_SECTION>>", renderEducation(resume.getEducation()));

        return tex;
    }

    private String formatLink(String url, String label, String icon) {
        if (url == null || url.isBlank()) return "";
        if (icon == null || icon.isEmpty()) {
            return String.format(" ~ \\href{%s}{%s}", escapeLatex(url), escapeLatex(label));
        }
        return String.format(" ~ \\href{%s}{%s~%s}", escapeLatex(url), icon, escapeLatex(label));
    }

    private String renderSummary(String summary) {
        if (summary == null || summary.isBlank()) return "";
        return "\\section{Summary}\n" + escapeLatex(summary) + "\n";
    }

    private String renderExperience(List<Resume.Experience> experience) {
        if (experience == null || experience.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\\section{Experience}\n\\resumeSubHeadingListStart\n");
        for (var job : experience) {
            String duration = job.getStartDate() != null ? job.getStartDate() : "";
            if (job.getEndDate() != null && !job.getEndDate().isBlank()) {
                duration += " -- " + job.getEndDate();
            }
            sb.append(String.format("  \\resumeSubheading{%s}{%s}{%s}{%s}\n",
                    escapeLatex(job.getCompany()),
                    escapeLatex(duration),
                    escapeLatex(job.getTitle()),
                    escapeLatex(job.getLocation())
            ));
            
            List<String> validBullets = job.getBullets() != null 
                    ? job.getBullets().stream()
                        .filter(b -> b != null && !b.strip().isEmpty())
                        .map(String::strip)
                        .toList() 
                    : List.of();
            if (!validBullets.isEmpty()) {
                sb.append("    \\resumeItemListStart\n");
                for (String desc : validBullets) {
                    sb.append("      \\resumeItem{").append(escapeLatex(desc)).append("}\n");
                }
                sb.append("    \\resumeItemListEnd\n");
            }
        }
        sb.append("\\resumeSubHeadingListEnd\n");
        return sb.toString();
    }

    private String renderProjects(List<Resume.Project> projects) {
        if (projects == null || projects.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\\section{Projects}\n\\resumeSubHeadingListStart\n");
        for (var proj : projects) {
            String title = escapeLatex(proj.getName());
            String tech = proj.getTechnologies() != null && !proj.getTechnologies().isBlank() 
                    ? escapeLatex(proj.getTechnologies()) : "";
            String link = proj.getUrl() != null && !proj.getUrl().isBlank() ? formatLink(proj.getUrl(), "GitHub", "") : "";
            String titleWithLink = title + (link.isEmpty() ? "" : " $|$ " + link);
            
            sb.append(String.format("  \\resumeProjectHeading{%s}{%s}{%s}{%s}\n",
                    titleWithLink, "", tech, ""
            ));
            
            List<String> validBullets = proj.getBullets() != null 
                    ? proj.getBullets().stream()
                        .filter(b -> b != null && !b.strip().isEmpty())
                        .map(String::strip)
                        .toList() 
                    : List.of();
            if (!validBullets.isEmpty()) {
                sb.append("    \\resumeItemListStart\n");
                for (String desc : validBullets) {
                    sb.append("      \\resumeItem{").append(escapeLatex(desc)).append("}\n");
                }
                sb.append("    \\resumeItemListEnd\n");
            }
        }
        sb.append("\\resumeSubHeadingListEnd\n");
        return sb.toString();
    }

    private String renderSkills(Resume.Skills skills) {
        if (skills == null) return "";
        StringBuilder sb = new StringBuilder("\\section{Technical Skills}\n\\begin{itemize}[leftmargin=0.0in, label={}]\n  \\small{\\item{\n");
        
        if (skills.getLanguages() != null && !skills.getLanguages().isEmpty()) {
            sb.append("    \\textbf{\\large Languages}{: ").append(escapeLatex(String.join(", ", skills.getLanguages()))).append("} \\\\[3pt]\n");
        }
        if (skills.getFrameworks() != null && !skills.getFrameworks().isEmpty()) {
            sb.append("    \\textbf{\\large Frameworks}{: ").append(escapeLatex(String.join(", ", skills.getFrameworks()))).append("} \\\\[3pt]\n");
        }
        if (skills.getDatabases() != null && !skills.getDatabases().isEmpty()) {
            sb.append("    \\textbf{\\large Databases}{: ").append(escapeLatex(String.join(", ", skills.getDatabases()))).append("} \\\\[3pt]\n");
        }
        if (skills.getCloud() != null && !skills.getCloud().isEmpty()) {
            sb.append("    \\textbf{\\large Cloud}{: ").append(escapeLatex(String.join(", ", skills.getCloud()))).append("} \\\\[3pt]\n");
        }
        if (skills.getTools() != null && !skills.getTools().isEmpty()) {
            sb.append("    \\textbf{\\large Tools}{: ").append(escapeLatex(String.join(", ", skills.getTools()))).append("} \\\\[3pt]\n");
        }
        if (skills.getMethodologies() != null && !skills.getMethodologies().isEmpty()) {
            sb.append("    \\textbf{\\large Methodologies}{: ").append(escapeLatex(String.join(", ", skills.getMethodologies()))).append("} \\\\[3pt]\n");
        }
        if (skills.getAiml() != null && !skills.getAiml().isEmpty()) {
            sb.append("    \\textbf{\\large AI/LLM Engineering}{: ").append(escapeLatex(String.join(", ", skills.getAiml()))).append("} \\\\[3pt]\n");
        }
        
        sb.append("  }}\n\\end{itemize}\n");
        return sb.toString();
    }

    private String renderEducation(List<Resume.Education> education) {
        if (education == null || education.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\\section{Education}\n\\resumeSubHeadingListStart\n");
        for (var edu : education) {
            String duration = edu.getStartDate() != null ? edu.getStartDate() : "";
            if (edu.getEndDate() != null && !edu.getEndDate().isBlank()) {
                duration += " -- " + edu.getEndDate();
            }
            sb.append(String.format("  \\resumeSubheading{%s}{%s}{%s}{%s}\n",
                    escapeLatex(edu.getInstitution()),
                    "", // Location not in model
                    escapeLatex(edu.getDegree() + " in " + edu.getField() + (edu.getGpa() != null && !edu.getGpa().isBlank() ? " | CGPA: " + edu.getGpa() : "")),
                    escapeLatex(duration)
            ));
        }
        sb.append("\\resumeSubHeadingListEnd\n");
        return sb.toString();
    }
    private String renderAchievements(List<String> achievements) {
        if (achievements == null || achievements.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\\section{Achievements}\n\\resumeAchievementListStart\n");
        for (String ach : achievements) {
            if (ach != null && !ach.isBlank()) {
                sb.append("  \\resumeItem{").append(escapeLatex(ach)).append("}\n");
            }
        }
        sb.append("\\resumeAchievementListEnd\n");
        return sb.toString();
    }

    private String renderCertifications(List<String> certifications) {
        if (certifications == null || certifications.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\\section{Certifications}\n\\resumeAchievementListStart\n");
        for (String cert : certifications) {
            if (cert != null && !cert.isBlank()) {
                sb.append("  \\resumeItem{").append(escapeLatex(cert)).append("}\n");
            }
        }
        sb.append("\\resumeAchievementListEnd\n");
        return sb.toString();
    }

    /**
     * Escape LaTeX special characters to prevent compilation errors.
     */
    private String escapeLatex(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\textbackslash{}")
                .replace("&", "\\&")
                .replace("%", "\\%")
                .replace("$", "\\$")
                .replace("#", "\\#")
                .replace("_", "\\_")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace("~", "\\textasciitilde{}")
                .replace("^", "\\textasciicircum{}");
    }
}
