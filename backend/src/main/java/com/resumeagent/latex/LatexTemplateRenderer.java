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
            tex = tex.replace("<<LOCATION>>", (loc == null || loc.isBlank()) ? "~" : escapeLatex(loc));
            
            tex = tex.replace("<<PHONE>>", escapeLatex(resume.getPersonalInfo().getPhone()));
            tex = tex.replace("<<EMAIL>>", escapeLatex(resume.getPersonalInfo().getEmail()));

            // Links
            tex = tex.replace("<<LINKEDIN>>", formatLink(resume.getPersonalInfo().getLinkedin(), "LinkedIn", "\\faLinkedin"));
            tex = tex.replace("<<GITHUB>>", formatLink(resume.getPersonalInfo().getGithub(), "GitHub", "\\faGithub"));
            tex = tex.replace("<<PORTFOLIO>>", formatLink(resume.getPersonalInfo().getPortfolio(), "Portfolio", "\\faGlobe"));
        } else {
            tex = tex.replace("<<NAME>>", "~").replace("<<LOCATION>>", "~").replace("<<PHONE>>", "").replace("<<EMAIL>>", "");
            tex = tex.replace("<<LINKEDIN>>", "").replace("<<GITHUB>>", "").replace("<<PORTFOLIO>>", "");
        }

        // Sections
        tex = tex.replace("<<SUMMARY_SECTION>>", renderSummary(resume.getSummary()));
        tex = tex.replace("<<EXPERIENCE_SECTION>>", renderExperience(resume.getExperience()));
        tex = tex.replace("<<PROJECTS_SECTION>>", renderProjects(resume.getProjects()));
        tex = tex.replace("<<SKILLS_SECTION>>", renderSkills(resume.getSkills()));
        tex = tex.replace("<<EDUCATION_SECTION>>", renderEducation(resume.getEducation()));

        return tex;
    }

    private String formatLink(String url, String label, String icon) {
        if (url == null || url.isBlank()) return "";
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
                    escapeLatex(job.getLocation()),
                    escapeLatex(job.getTitle()),
                    escapeLatex(duration)
            ));
            
            if (job.getBullets() != null && !job.getBullets().isEmpty()) {
                sb.append("    \\resumeItemListStart\n");
                for (String desc : job.getBullets()) {
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
                    ? " $|$ \\emph{" + escapeLatex(proj.getTechnologies()) + "}" : "";
            
            sb.append(String.format("  \\resumeProjectHeading{\\textbf{%s}%s}{%s}\n",
                    title, tech, ""
            ));
            
            if (proj.getBullets() != null && !proj.getBullets().isEmpty()) {
                sb.append("    \\resumeItemListStart\n");
                for (String desc : proj.getBullets()) {
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
        StringBuilder sb = new StringBuilder("\\section{Technical Skills}\n\\begin{itemize}[leftmargin=0.15in, label={}]\n  \\small{\\item{\n");
        
        if (skills.getLanguages() != null && !skills.getLanguages().isEmpty()) {
            sb.append("    \\textbf{Languages}{: ").append(escapeLatex(String.join(", ", skills.getLanguages()))).append("} \\\\\n");
        }
        if (skills.getFrameworks() != null && !skills.getFrameworks().isEmpty()) {
            sb.append("    \\textbf{Frameworks}{: ").append(escapeLatex(String.join(", ", skills.getFrameworks()))).append("} \\\\\n");
        }
        if (skills.getDatabases() != null && !skills.getDatabases().isEmpty()) {
            sb.append("    \\textbf{Databases}{: ").append(escapeLatex(String.join(", ", skills.getDatabases()))).append("} \\\\\n");
        }
        if (skills.getCloud() != null && !skills.getCloud().isEmpty()) {
            sb.append("    \\textbf{Cloud}{: ").append(escapeLatex(String.join(", ", skills.getCloud()))).append("} \\\\\n");
        }
        if (skills.getTools() != null && !skills.getTools().isEmpty()) {
            sb.append("    \\textbf{Tools}{: ").append(escapeLatex(String.join(", ", skills.getTools()))).append("} \\\\\n");
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
                    escapeLatex(edu.getDegree() + " in " + edu.getField()),
                    escapeLatex(duration)
            ));
        }
        sb.append("\\resumeSubHeadingListEnd\n");
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
