# AI Resume Agent — Product Requirements & Technical Design

> **A ChatGPT-like AI Resume Agent that helps users create a professional profile, maintain a master resume, analyze job descriptions, and generate job-specific resumes.**

---

# 1. Project Overview

The AI Resume Agent is a conversational application where users interact with an AI assistant through a ChatGPT-like interface.

The agent will help users:

- Complete first-time onboarding.
- Create and manage their professional profile.
- Upload their existing resume.
- Extract information from their resume.
- Convert resume information into structured JSON.
- Generate and maintain a master resume.
- Store resumes locally as JSON, LaTeX, and PDF.
- Analyze job descriptions from job URLs.
- Compare a job description against the user's resume.
- Identify strong matches and skill gaps.
- Generate customized resumes for specific jobs.
- Improve the master resume.
- Access previous conversations and generated resumes.

The application should support both:

1. **Natural language interaction**
2. **Slash commands**

---

# 2. Primary Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

## Backend

```text
Java 21
Spring Boot
Spring Web
```

## AI / LLM

```text
NVIDIA NIM API
NVIDIA API Key
OpenAI-Compatible API Client
```

The LLM integration should be abstracted behind a provider interface so that another provider can be added later.

## Resume Processing

```text
PDF Text Extraction
Structured JSON
LaTeX Templates
pdflatex
```

## Initial Storage

```text
Local File System
```

Future versions can introduce:

```text
PostgreSQL
Cloud Storage
```

---

# 3. Application UI

The application should have a conversational UI similar to ChatGPT.

```text
┌──────────────────────┬─────────────────────────────────────────────┐
│                      │                                             │
│ 🤖 AI Resume Agent   │            Resume Assistant                 │
│                      │                                             │
│ + New Chat           │   AI: How can I help you today?            │
│                      │                                             │
│ ─── MY RESUME ───    │   You: Generate a resume for this job      │
│                      │                                             │
│ 📄 Master Resume     │   You: [Job URL]                           │
│                      │                                             │
│ ─── RECENT ──────    │   AI: I am analyzing the job...            │
│                      │                                             │
│ 📄 Google SDE        │                                             │
│ 📄 Amazon Backend    │                                             │
│ 📄 Microsoft Java    │                                             │
│                      │                                             │
│ ⚙️ Settings          │                                             │
│                      ├─────────────────────────────────────────────┤
│                      │ 📎 Ask anything or type "/"           ↑    │
│                      └─────────────────────────────────────────────┘
└──────────────────────┴─────────────────────────────────────────────┘
```

---

# 4. Main UI Sections

## 4.1 Left Sidebar

The left sidebar should contain:

```text
+ New Chat

MY RESUME
📄 Master Resume

RECENT RESUMES
📄 Google - Software Engineer
📄 Amazon - Backend Engineer
📄 Microsoft - Java Developer

SETTINGS
⚙️ Profile
⚙️ Resume Preferences
```

The sidebar allows the user to:

- Start a new conversation.
- View the master resume.
- View generated resumes.
- Open previous conversations.
- Access profile settings.

---

## 4.2 Main Chat Area

The user should be able to communicate naturally.

Examples:

```text
Create a resume for a Java backend engineer role.
```

```text
Analyze my resume for this job.
```

```text
What skills am I missing for this role?
```

```text
Improve my project descriptions.
```

The system should automatically detect the user's intent.

---

## 4.3 Chat Input

The chat input should support:

```text
Natural Language
Slash Commands
Job URLs
File Uploads
Resume Uploads
```

Example:

```text
Ask anything or type "/"
```

When the user types `/`, the application should display available commands.

---

# 5. Slash Command System

The application should support the following commands.

| Command | Purpose |
|---|---|
| `/init` | Start or continue first-time onboarding |
| `/profile` | View or update profile |
| `/resume` | Generate a job-specific resume |
| `/analyze` | Analyze a resume against a job |
| `/improve` | Improve the master resume |
| `/status` | View workflow or onboarding status |
| `/help` | Show available commands |
| `/cancel` | Cancel the current workflow |

Some commands are context-specific.

For example:

```text
/skip
/back
```

These can be shown only when the current workflow supports them.

---

# 6. `/init` — First-Time User Onboarding

`/init` is the primary command for first-time onboarding.

A new user should not necessarily need to manually type `/init`.

The frontend can display:

```text
Welcome to AI Resume Agent 👋

Let's set up your professional profile.

[ Set Up My Profile ]
```

Clicking the button internally starts the `/init` workflow.

---

# 7. `/init` Workflow

The onboarding process consists of five stages.

```text
/init
   │
   ▼
① Basic Profile
   │
   ▼
② Professional Links
   │
   ▼
③ Resume Upload
   │
   ▼
④ Resume Review
   │
   ▼
⑤ Master Resume Generation
```

---

# 8. `/init` State Management

The `/init` command must be idempotent.

```text
/init
   │
   ▼
Check User Setup State
   │
   ├── NEW
   │      │
   │      ▼
   │   Start Onboarding
   │
   ├── IN_PROGRESS
   │      │
   │      ▼
   │   Resume From Previous Step
   │
   └── COMPLETED
          │
          ▼
      Show Profile Status
```

## User States

```text
NEW
IN_PROGRESS
COMPLETED
```

Example:

```text
User: /init

AI: Welcome back!

Your onboarding is 60% complete.

✓ Basic Details
✓ Professional Links
✗ Resume Upload

Let's continue from the resume upload step.
```

---

# 9. Stage 1 — Basic Profile

Collect the following information.

## Required

```text
Full Name
Email
Phone Number
Location
```

Example:

```text
AI: What is your full name?

User: Chandan Kumar

AI: What is your email address?

User: example@email.com
```

---

# 10. Stage 2 — Professional Links

Collect:

```text
LinkedIn URL
GitHub URL
LeetCode URL
Portfolio URL
Personal Website
```

These should be optional.

Example:

```text
AI: What is your GitHub URL?

User: /skip

AI: No problem. You can add it later from your profile settings.
```

---

# 11. Stage 3 — Resume Upload

The AI asks:

```text
Please upload your current resume in PDF format.
```

The user uploads:

```text
resume.pdf
```

Processing flow:

```text
Resume PDF
    │
    ▼
PDF Text Extraction
    │
    ▼
LLM Resume Parsing
    │
    ▼
Structured Resume JSON
```

---

# 12. Stage 4 — Resume Review

The system should not immediately trust extracted AI information.

The user must be able to review the extracted data.

Example:

```text
AI: I extracted the following information:

Name: Chandan Kumar
Experience: 3 Years

Primary Skills:
• Java
• Spring Boot
• Microservices

Projects: 3
Education: B.Tech

Does this look correct?

[ Confirm ]
[ Edit Information ]
```

Only verified information should be used to generate the master resume.

---

# 13. Stage 5 — Master Resume Generation

After user confirmation:

```text
Verified Resume JSON
       │
       ▼
LaTeX Template
       │
       ▼
master_resume.tex
       │
       ▼
LaTeX Compiler
       │
       ▼
master_resume.pdf
```

The system then displays:

```text
🎉 Your profile and master resume are ready!

You can now:

📄 Generate a job-specific resume
🔍 Analyze a job description
✨ Improve your resume
```

---

# 14. `/status` Command

The user can check workflow progress.

Example:

```text
User: /status
```

Response:

```text
Profile Setup: 75% Complete

✓ Basic Details
✓ Professional Links
✓ Resume Uploaded
◉ Resume Review
○ Master Resume Generation
```

---

# 15. `/cancel` Command

The user can cancel an active workflow.

```text
User: /cancel
```

The system should:

```text
Cancel Current Step
      │
      ▼
Save Existing Progress
      │
      ▼
Mark Workflow As Paused
```

The user can later continue with:

```text
/init
```

---

# 16. `/profile` Command

The `/profile` command allows users to view or modify profile information.

Example:

```text
/profile
```

The user should be able to update:

```text
Name
Email
Phone
Location
LinkedIn
GitHub
LeetCode
Portfolio
```

Changes should be reflected in future generated resumes.

---

# 17. `/resume` Command

The `/resume` command generates a job-specific resume.

Example:

```text
/resume
```

The AI responds:

```text
Please share the job URL.
```

Or:

```text
/resume https://company.com/jobs/12345
```

---

# 18. `/resume` Workflow

Every call to `/resume` MUST run the following **mandatory 4-step pipeline** from scratch.
No step may be skipped. No prior job's selection, bullets, or skills section may be reused.
If Step A fails, generation must stop — the system must NOT fall back to reusing the master resume.

```text
Receive Job URL
       │
       ▼
Extract Job Description
       │
       ▼
Parse Job → Structured Job JSON
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              §18 MANDATORY GENERATION PIPELINE           │
│                                                          │
│  Step A — Extract Target Role                            │
│    Pull: job title, seniority, domain,                   │
│          required skills, preferred skills,              │
│          key responsibilities, ATS keywords.             │
│    ⚠ If Step A fails → STOP. Do not generate resume.     │
│                    │                                     │
│                    ▼                                     │
│  Step B — Select Experience & Projects                   │
│    Re-score the ENTIRE verified pool against             │
│    the Step A TargetRole — every single call.            │
│    Never reuse a prior job's content selection.          │
│                    │                                     │
│                    ▼                                     │
│  Step C — Rewrite Bullet Points                          │
│    Reframe each selected entry's bullets toward          │
│    this role's emphasis. Facts are immutable.            │
│    No new bullets may be invented.                       │
│                    │                                     │
│                    ▼                                     │
│  Step D — Build Skills Section from the JD               │
│    Include ONLY JD required/preferred skills             │
│    that the user actually has, plus ≤ 2 closely          │
│    related skills from their verified pool.              │
│    Never dump the full master skill list.                │
└──────────────────────────────────────────────────────────┘
       │
       ▼
§18.5 Regression Checks (see below)
       │
       ▼
Generate LaTeX
       │
       ▼
Compile PDF
       │
       ▼
Save Locally
```

---

# 18.5. Regression Checks

These are **explicit rejection rules** that act as the direct guard against the
"same resume every time" bug. Both checks run after Step D, before LaTeX generation.

## Check 1 — Byte-Identity Guard

```text
IF fingerprint(generated_resume) == previousResumeFingerprint
    THEN reject generation with HTTP 409
    REASON: The content selection is not role-specific.
```

- The caller (Java backend) stores the SHA-256 fingerprint of the last generated resume per user.
- It passes this fingerprint as `previousResumeFingerprint` on the next generation request.
- If the newly generated resume has an identical fingerprint (same content for a different role),
  generation is rejected and the pipeline does not produce a PDF.

## Check 2 — Skills-Copy Guard

```text
IF skills(generated_resume) == skills(master_resume)
    THEN reject with RuntimeError
    REASON: Step D did not apply JD-scoping — the full master list was dumped.
```

- The AI service compares every category (languages, frameworks, databases, cloud, tools).
- If all categories are identical between the generated and master skills sections, Step D failed.
- This is caught at the Python layer before the resume reaches the LaTeX compiler.



# 19. `/analyze` Command

The `/analyze` command compares the master resume against a job description.

Example:

```text
/analyze https://company.com/jobs/12345
```

Expected output:

```text
Resume Match Analysis

Overall Match: 82%

Strong Matches:
✓ Java
✓ Spring Boot
✓ Microservices

Partial Matches:
~ Kafka
~ Distributed Systems

Missing or Weak Coverage:
⚠ AWS
⚠ Kubernetes

Recommendations:
1. Prioritize backend experience.
2. Highlight distributed systems projects.
3. Move Java and Spring Boot higher in the skills section.
```

The system must clearly distinguish between:

```text
Strong Match
Partial Match
Missing Requirement
```

---

# 20. `/improve` Command

The `/improve` command improves the master resume.

Examples:

```text
/improve
```

```text
/improve my Java backend experience
```

```text
/improve ATS compatibility
```

Supported improvement areas:

```text
Professional Summary
Work Experience
Projects
Skills
ATS Optimization
Overall Resume Quality
```

The AI should always show proposed changes before permanently updating the master resume.

---

# 21. Natural Language Intent Detection

Slash commands are optional.

The following natural language requests should automatically route to the correct workflow.

```text
Generate a resume for this job.
```

→ `/resume`

```text
How well does my resume match this role?
```

→ `/analyze`

```text
Make my resume more ATS friendly.
```

→ `/improve`

Architecture:

```text
User Message
      │
      ▼
Is Slash Command?
      │
      ├── Yes
      │      │
      │      ▼
      │  Command Router
      │
      └── No
             │
             ▼
       Intent Detection
             │
             ▼
       Workflow Router
```

---

# 22. Resume Data Architecture

The system must use structured data as the source of truth.

```text
Original Resume PDF
        │
        ▼
Structured Resume JSON
        │
        ├──► Master Resume
        │
        └──► Job-Specific Resume
```

Do not treat the PDF as the primary editable source.

---

# 23. Resume JSON Structure

Example:

```json
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "leetcode": ""
  },
  "summary": "",
  "skills": {
    "languages": [],
    "frameworks": [],
    "databases": [],
    "cloud": [],
    "tools": []
  },
  "experience": [],
  "projects": [],
  "education": [],
  "certifications": [],
  "achievements": []
}
```

This JSON should be the primary source for future resume generation.

---

# 24. Master Resume

The system generates:

```text
master_resume.json
master_resume.tex
master_resume.pdf
```

The master resume represents the user's verified professional information.

It should not be automatically overwritten by job-specific resumes.

---

# 25. Resume Generation Rules

## The AI Can

```text
✓ Rewrite bullet points
✓ Improve wording
✓ Optimize ATS keywords
✓ Reorder sections
✓ Reorder skills
✓ Prioritize relevant projects
✓ Adjust the professional summary
✓ Emphasize relevant experience
```

## The AI Cannot

```text
❌ Invent work experience
❌ Invent skills
❌ Add fake projects
❌ Create fake certifications
❌ Create fake achievements
❌ Modify factual employment dates
❌ Fabricate technical experience
```

The AI must only optimize existing and verified information.

---

# 26. Job URL Processing

The user provides a job URL.

Example:

```text
https://company.com/careers/jobs/12345
```

The system extracts:

```text
Company
Job Title
Location
Job Description
Responsibilities
Required Skills
Preferred Skills
Experience Requirements
Education Requirements
```

---

# 27. Job Extraction Architecture

```text
Job URL
   │
   ▼
Identify Job Platform
   │
   ├── Known Platform
   │      │
   │      ▼
   │   Platform-Specific Extractor
   │
   └── Unknown Platform
          │
          ▼
      Generic Extractor
          │
          ▼
      Clean Web Content
          │
          ▼
      LLM Parser
          │
          ▼
      Structured Job JSON
```

---

# 28. Structured Job JSON

Example:

```json
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
```

---

# 29. Resume Matching Engine

The system compares:

```text
Master Resume
      VS
Job Description
```

It evaluates:

```text
Skills
Technologies
Experience
Projects
Responsibilities
Keywords
Seniority
Domain Knowledge
```

---

# 30. Match Categories

## Strong Match

The user clearly has the required experience.

```text
Job Requirement: Java
User Experience: Java + Spring Boot

Result: Strong Match
```

## Partial Match

The user has related experience.

```text
Job Requirement: Kubernetes
User Experience: Docker + Microservices

Result: Partial Match
```

## Missing

There is no evidence of this skill.

```text
Job Requirement: AWS
User Resume: No AWS experience

Result: Missing
```

Missing skills must not automatically be added to the generated resume.

---

# 31. Match Report

Example:

```json
{
  "overallMatchScore": 82,
  "strongMatches": [
    "Java",
    "Spring Boot",
    "Microservices"
  ],
  "partialMatches": [
    "Kafka",
    "Distributed Systems"
  ],
  "missingSkills": [
    "AWS",
    "Kubernetes"
  ],
  "recommendations": [
    "Prioritize backend experience",
    "Highlight relevant distributed systems projects",
    "Move Java and Spring Boot higher in the skills section"
  ]
}
```

---

# 32. NVIDIA LLM Integration

The initial MVP will use NVIDIA's API for LLM inference.

The API key must remain on the backend.

## Environment Configuration

Create:

```text
.env
```

Example:

```env
NVIDIA_API_KEY=your_api_key

NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

NVIDIA_MODEL=your_selected_model

APP_ENV=local

STORAGE_PATH=./storage

LATEX_COMPILER=pdflatex
```

Never expose:

```text
NVIDIA_API_KEY
```

to the frontend.

Add `.env` to `.gitignore`.

---

# 33. LLM Provider Abstraction

Do not tightly couple business logic to NVIDIA.

Create:

```text
LLMProvider
```

Interface:

```text
generateChatResponse()

generateStructuredOutput()

streamResponse()
```

Implementation:

```text
LLMProvider
     │
     └── NvidiaLLMProvider
```

Future implementations:

```text
LLMProvider
     │
     ├── NvidiaLLMProvider
     ├── OpenAILLMProvider
     └── LocalLLMProvider
```

---

# 34. LLM Responsibilities

Use the LLM for:

```text
Intent Detection
Resume Parsing
Job Description Parsing
Resume Matching
Keyword Analysis
Resume Improvement
Resume Content Optimization
Conversational Responses
```

Prefer specialized prompts instead of one massive prompt.

```text
Specific Task
      │
      ▼
Specialized Prompt
      │
      ▼
Structured Output
```

---

# 35. Agent Architecture

Use controlled, workflow-based agents for the MVP.

```text
                    Agent Orchestrator
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 Onboarding Agent      Job Agent         Resume Agent
        │                  │                  │
        ▼                  ▼                  ▼
 Profile Service     Job Extractor     Resume Parser
                                              │
                                              ▼
                                       Resume Matcher
                                              │
                                              ▼
                                       Resume Generator
                                              │
                                              ▼
                                       LaTeX Compiler
```

Avoid creating an unrestricted autonomous agent during the MVP.

---

# 36. Agent Responsibilities

## Onboarding Agent

```text
Collect profile information
Validate information
Track onboarding state
Handle /skip and /back
Resume interrupted onboarding
```

## Job Agent

```text
Receive job URL
Extract page content
Clean content
Generate structured job JSON
```

## Resume Agent

```text
Parse uploaded resume
Generate structured resume JSON
Generate master resume
Generate job-specific resume
```

## Match Agent

```text
Compare resume and job
Identify strong matches
Identify partial matches
Identify missing requirements
Generate recommendations
Calculate match score
```

---

# 37. LaTeX Generation Strategy

Use a stable LaTeX template.

```text
resume_template.tex
        +
structured_resume.json
        │
        ▼
Template Renderer
        │
        ▼
resume.tex
        │
        ▼
pdflatex
        │
        ▼
resume.pdf
```

Do not allow the LLM to redesign the entire LaTeX structure for every request.

The LLM should primarily generate structured content.

---

# 38. Local Storage Structure

```text
storage/
│
└── users/
    │
    └── user_001/
        │
        ├── profile/
        │   └── profile.json
        │
        ├── onboarding/
        │   └── onboarding_state.json
        │
        ├── master/
        │   ├── original_resume.pdf
        │   ├── resume_data.json
        │   ├── master_resume.tex
        │   └── master_resume.pdf
        │
        ├── generated/
        │   │
        │   ├── google_sde_2026_09_03/
        │   │   ├── job.json
        │   │   ├── match_report.json
        │   │   ├── resume_data.json
        │   │   ├── resume.tex
        │   │   └── resume.pdf
        │   │
        │   └── amazon_backend_2026_09_04/
        │
        └── conversations/
            ├── conversation_001.json
            └── conversation_002.json
```

---

# 39. Conversation Storage

Each conversation should contain:

```json
{
  "conversationId": "conversation_001",
  "title": "Google SDE Resume",
  "status": "ACTIVE",
  "createdAt": "",
  "updatedAt": "",
  "messages": []
}
```

Possible statuses:

```text
ACTIVE
COMPLETED
PAUSED
CANCELLED
```

---

# 40. Frontend Architecture

```text
App
│
├── Sidebar
│   ├── NewChatButton
│   ├── MasterResume
│   ├── ResumeHistory
│   └── Settings
│
├── ChatWindow
│   ├── MessageList
│   ├── UserMessage
│   ├── AssistantMessage
│   └── TypingIndicator
│
└── ChatInput
    ├── SlashCommandMenu
    ├── FileUpload
    └── SendButton
```

---

# 41. Backend Project Structure

```text
backend/
│
├── controller/
│   ├── ChatController
│   ├── UserController
│   ├── ResumeController
│   └── JobController
│
├── service/
│   ├── ChatService
│   ├── UserService
│   ├── ResumeService
│   ├── JobService
│   └── LLMService
│
├── agent/
│   ├── AgentOrchestrator
│   ├── OnboardingAgent
│   ├── ResumeAgent
│   ├── JobAgent
│   └── MatchAgent
│
├── llm/
│   ├── LLMProvider
│   └── NvidiaLLMProvider
│
├── domain/
│   ├── UserProfile
│   ├── Resume
│   ├── Job
│   ├── Conversation
│   └── Message
│
└── storage/
    └── FileStorageService
```

---

# 42. Suggested APIs

## Send Chat Message

```text
POST /api/chat/messages
```

Request:

```json
{
  "conversationId": "conversation_001",
  "message": "Create a resume for this job",
  "attachments": []
}
```

---

## Initialize User

```text
POST /api/users/init
```

---

## Get Onboarding Status

```text
GET /api/users/onboarding/status
```

---

## Update Profile

```text
PUT /api/users/profile
```

---

## Upload Resume

```text
POST /api/users/resume/upload
```

---

## Generate Resume

```text
POST /api/resumes/generate
```

---

## Analyze Resume

```text
POST /api/resumes/analyze
```

---

## Improve Resume

```text
POST /api/resumes/improve
```

---

# 43. Complete System Architecture

```text
                         USER
                           │
                           ▼
                 ┌─────────────────┐
                 │ Next.js Frontend│
                 │                 │
                 │ Chat Interface  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Spring Boot API │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Chat Orchestrator│
                 └────────┬────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    Onboarding Agent  Job Agent     Resume Agent
           │              │              │
           └──────────────┼──────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ NVIDIA LLM API  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Structured JSON │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ LaTeX Generator │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ PDF Compiler    │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Local Storage   │
                 │ JSON | TEX | PDF│
                 └─────────────────┘
```

---

# 44. Development Phases

## Phase 1 — Foundation

```text
✓ Next.js frontend
✓ Spring Boot backend
✓ Basic Chat UI
✓ Basic Chat API
✓ Local storage configuration
```

---

## Phase 2 — NVIDIA LLM Integration

```text
✓ LLMProvider interface
✓ NvidiaLLMProvider
✓ Chat responses
✓ Streaming responses
✓ Structured JSON output
```

---

## Phase 3 — `/init` Onboarding

```text
✓ Onboarding state machine
✓ Basic profile collection
✓ Professional links
✓ /skip support
✓ /back support
✓ /status support
✓ Resume interrupted onboarding
```

---

## Phase 4 — Resume Processing

```text
✓ Resume upload
✓ PDF text extraction
✓ LLM resume parsing
✓ Structured JSON validation
✓ Resume review
```

---

## Phase 5 — Master Resume

```text
✓ LaTeX template
✓ Template rendering
✓ master_resume.tex generation
✓ PDF compilation
✓ Local storage
```

---

## Phase 6 — Chat Agent

```text
✓ Slash command detection
✓ Natural language intent detection
✓ Workflow routing
✓ Conversation storage
```

---

## Phase 7 — Job Analysis

```text
✓ Job URL input
✓ Job extraction
✓ Content cleaning
✓ Structured job JSON
✓ Resume-job comparison
✓ Match report
```

---

## Phase 8 — Job-Specific Resume

```text
✓ Customized resume data
✓ Resume optimization
✓ LaTeX generation
✓ PDF generation
✓ Resume history
```

---

# 45. MVP Development Order

Build the project in this order:

```text
1. ChatGPT-like Frontend
        │
        ▼
2. Spring Boot Backend
        │
        ▼
3. NVIDIA LLM Integration
        │
        ▼
4. /init Onboarding
        │
        ▼
5. Resume Upload
        │
        ▼
6. Resume PDF → JSON
        │
        ▼
7. JSON → Master LaTeX
        │
        ▼
8. LaTeX → PDF
        │
        ▼
9. /analyze Job URL
        │
        ▼
10. /resume Customized Resume
        │
        ▼
11. /improve Master Resume
```

---

# 46. Critical Engineering Principles

## Structured Data First

```text
PDF
 ↓
JSON
 ↓
LaTeX
 ↓
PDF
```

---

## Master Resume Protection

Job-specific resumes must never automatically overwrite:

```text
master_resume.json
master_resume.tex
master_resume.pdf
```

---

## No AI Fabrication

The AI may improve presentation but cannot invent professional facts.

---

## LLM Provider Abstraction

The business logic should not depend directly on NVIDIA.

```text
LLMProvider
     │
     ▼
NvidiaLLMProvider
```

---

## Controlled Workflows

Use:

```text
User Request
      │
      ▼
Intent Detection
      │
      ▼
Specific Workflow
      │
      ▼
Controlled Tools
      │
      ▼
Result
```

Avoid unrestricted autonomous behavior in the initial MVP.

---

# 47. MVP Success Criteria

The MVP is successful when a user can:

1. Open the application.
2. Complete onboarding using `/init`.
3. Resume interrupted onboarding.
4. Update their professional profile.
5. Upload an existing resume.
6. Convert the resume into structured JSON.
7. Review extracted information.
8. Generate a master LaTeX resume.
9. Generate a master PDF resume.
10. Use natural language or slash commands.
11. Share a job URL.
12. Extract and analyze the job description.
13. Compare the job against their resume.
14. Generate a match report.
15. Generate a customized resume.
16. Download the generated PDF.
17. Access previous resumes and conversations.

---

# 48. Final Command Structure

```text
SETUP

/init
    Start or continue onboarding.

/profile
    View or update professional details.

/status
    View onboarding or workflow progress.


RESUME

/resume
    Generate a job-specific resume.

/analyze
    Analyze resume compatibility with a job.

/improve
    Improve the master resume.


UTILITY

/help
    Display available commands.

/cancel
    Stop the active workflow.


CONTEXT-SPECIFIC

/skip
    Skip an optional onboarding field.

/back
    Return to the previous workflow step.
```

---

# 49. Final Product Flow

```text
NEW USER
    │
    ▼
/init
    │
    ▼
Basic Profile
    │
    ▼
Professional Links
    │
    ▼
Resume Upload
    │
    ▼
Resume Parsing
    │
    ▼
User Verification
    │
    ▼
Master Resume JSON
    │
    ▼
Master LaTeX
    │
    ▼
Master PDF
    │
    ▼
ONBOARDING COMPLETE
    │
    ├─────────────────────────────┐
    │                             │
    ▼                             ▼
/ analyze                       / resume
    │                             │
    ▼                             ▼
Job Analysis                 Job Extraction
    │                             │
    ▼                             ▼
Match Report                 Match Analysis
    │                             │
    └──────────────┬──────────────┘
                   │
                   ▼
          Customized Resume
                   │
                   ▼
             LaTeX Generation
                   │
                   ▼
              PDF Generation
                   │
                   ▼
             Local Storage
```

---

# 50. Final Architecture Summary

```text
                    ┌────────────────────┐
                    │      USER          │
                    └─────────┬──────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │   ChatGPT-Like UI       │
                │       Next.js           │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │     Spring Boot API     │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │    Agent Orchestrator   │
                └───────────┬─────────────┘
                            │
            ┌───────────────┼────────────────┐
            │               │                │
            ▼               ▼                ▼
     Onboarding Agent   Job Agent      Resume Agent
            │               │                │
            └───────────────┼────────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │  LLM Provider Layer     │
                │                         │
                │  NVIDIA NIM Provider    │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │  Structured JSON Data   │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │    LaTeX Generator      │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │      PDF Compiler       │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │      Local Storage      │
                │                         │
                │ JSON │ TEX │ PDF        │
                └─────────────────────────┘
```

---

## Recommended First Step

Start by building:

```text
ChatGPT-like Frontend
        +
Spring Boot Backend
        +
NVIDIA LLM Integration
        +
/init Onboarding Workflow
```

Once this foundation is stable, continue with:

```text
Resume Upload
    →
Resume Parsing
    →
Master Resume Generation
    →
Job Analysis
    →
Job-Specific Resume Generation
```

**The initial MVP should prioritize controlled workflows, structured data, reliable resume generation, and a high-quality conversational user experience.**