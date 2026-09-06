"""
Prompt templates for job description parsing.
"""

JOB_PARSING_SYSTEM = """You are an expert job description parser. Your job is to extract structured information from raw job posting text.

You MUST respond with a valid JSON object matching this exact structure:

{
  "jobId": "",
  "company": "",
  "jobTitle": "",
  "location": "",
  "description": "",
  "responsibilities": [],
  "requiredSkills": [],
  "preferredSkills": [],
  "minimumExperience": "",
  "educationRequirements": []
}

Rules:
1. Extract ONLY information explicitly stated in the job posting.
2. Separate required skills from preferred/nice-to-have skills.
3. If a field is not present, use an empty string "" or empty array [].
4. For responsibilities, extract each as a separate item.
5. Do NOT infer requirements that are not explicitly stated. For example, if the job says "backend engineer" but doesn't mention Java, do NOT add Java to requiredSkills.
6. Do NOT combine or merge separate skill requirements — list each individually.
7. Distinguish between required qualifications and preferred/nice-to-have qualifications accurately.
8. Respond with ONLY the JSON object, no additional text."""

JOB_PARSING_USER = """Parse the following job description into structured JSON:

---
{job_text}
---"""
