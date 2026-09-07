"""
Pydantic models (schemas) for AI service request/response validation.
These enforce that LLM output conforms to expected JSON structures.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums ──────────────────────────────────────────────────────────────

class OnboardingStatus(str, Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class OnboardingStage(str, Enum):
    BASIC_PROFILE = "BASIC_PROFILE"
    PROFESSIONAL_LINKS = "PROFESSIONAL_LINKS"
    RESUME_UPLOAD = "RESUME_UPLOAD"
    RESUME_REVIEW = "RESUME_REVIEW"
    EXPERIENCE_ENRICHMENT = "EXPERIENCE_ENRICHMENT"
    MASTER_GENERATION = "MASTER_GENERATION"


class Intent(str, Enum):
    INIT = "init"
    PROFILE = "profile"
    RESUME = "resume"
    ANALYZE = "analyze"
    IMPROVE = "improve"
    STATUS = "status"
    HELP = "help"
    CANCEL = "cancel"
    SKIP = "skip"
    BACK = "back"
    GENERAL_CHAT = "general_chat"


# ─── Domain Models ──────────────────────────────────────────────────────

class UserProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    leetcode: Optional[str] = None
    portfolio: Optional[str] = None
    website: Optional[str] = None


class Skills(BaseModel):
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    cloud: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = Field(None, alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    bullets: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class Project(BaseModel):
    name: Optional[str] = None
    technologies: Optional[str] = None
    url: Optional[str] = None
    bullets: list[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    start_date: Optional[str] = Field(None, alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    gpa: Optional[str] = None

    model_config = {"populate_by_name": True}


class PersonalInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    leetcode: Optional[str] = None


class Resume(BaseModel):
    personal_info: Optional[PersonalInfo] = Field(None, alias="personalInfo")
    summary: Optional[str] = None
    skills: Optional[Skills] = None
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class Job(BaseModel):
    job_id: Optional[str] = Field(None, alias="jobId")
    company: Optional[str] = None
    job_title: Optional[str] = Field(None, alias="jobTitle")
    location: Optional[str] = None
    description: Optional[str] = None
    responsibilities: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(None, alias="requiredSkills")
    preferred_skills: list[str] = Field(None, alias="preferredSkills")
    minimum_experience: Optional[str] = Field(None, alias="minimumExperience")
    education_requirements: list[str] = Field(None, alias="educationRequirements")
    source_url: Optional[str] = Field(None, alias="sourceUrl")

    model_config = {"populate_by_name": True}


class MatchReport(BaseModel):
    overall_match_score: int = Field(0, alias="overallMatchScore")
    strong_matches: list[str] = Field(default_factory=list, alias="strongMatches")
    partial_matches: list[str] = Field(default_factory=list, alias="partialMatches")
    missing_skills: list[str] = Field(default_factory=list, alias="missingSkills")
    recommendations: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class OnboardingState(BaseModel):
    status: OnboardingStatus = OnboardingStatus.NEW
    current_stage: Optional[OnboardingStage] = Field(None, alias="currentStage")
    completed_stages: list[OnboardingStage] = Field(default_factory=list, alias="completedStages")

    model_config = {"populate_by_name": True}


# ─── API Request/Response Models ────────────────────────────────────────

class MessageDto(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = Field(None, alias="conversationId")
    conversation_history: list[MessageDto] = Field(default_factory=list, alias="conversationHistory")
    user_profile: Optional[UserProfile] = Field(None, alias="userProfile")
    onboarding_state: Optional[OnboardingState] = Field(None, alias="onboardingState")
    master_resume: Optional[Resume] = Field(None, alias="masterResume")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    command: Optional[str] = None
    agent_type: Optional[str] = Field(None, alias="agentType")
    data: Optional[dict] = None
    actions: Optional[dict] = None

    model_config = {"populate_by_name": True, "by_alias": True}


class ResumeParseRequest(BaseModel):
    resume_text: str = Field(alias="resumeText")

    model_config = {"populate_by_name": True}


class JobParseRequest(BaseModel):
    job_text: str = Field(alias="jobText")

    model_config = {"populate_by_name": True}


class MatchRequest(BaseModel):
    resume: dict
    job: dict


class OptimizeRequest(BaseModel):
    master_resume: dict = Field(alias="masterResume")
    job: dict
    match_report: dict = Field(alias="matchReport")

    model_config = {"populate_by_name": True}


class ImproveRequest(BaseModel):
    master_resume: dict = Field(alias="masterResume")
    focus_area: str = Field("overall", alias="focusArea")

    model_config = {"populate_by_name": True}
