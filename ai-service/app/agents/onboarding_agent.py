"""
Onboarding Agent — manages the /init 5-stage onboarding workflow.
Handles state machine progression, /skip, /back, and field validation.
"""

import logging
from typing import Optional

from app.llm.provider import LLMProvider
from app.models.schemas import (
    ChatRequest, ChatResponse, OnboardingStage, OnboardingStatus,
)

logger = logging.getLogger(__name__)

# Define the stage order
STAGE_ORDER = [
    OnboardingStage.BASIC_PROFILE,
    OnboardingStage.PROFESSIONAL_LINKS,
    OnboardingStage.RESUME_UPLOAD,
    OnboardingStage.RESUME_REVIEW,
    OnboardingStage.MASTER_GENERATION,
]

# Fields to collect at each stage
STAGE_FIELDS = {
    OnboardingStage.BASIC_PROFILE: [
        ("name", "What is your **full name**?", True),
        ("email", "What is your **email address**?", True),
        ("phone", "What is your **phone number**?", True),
        ("location", "What is your **location** (city, state/country)?", True),
    ],
    OnboardingStage.PROFESSIONAL_LINKS: [
        ("linkedin", "What is your **LinkedIn URL**? _(type /skip to skip)_", False),
        ("github", "What is your **GitHub URL**? _(type /skip to skip)_", False),
        ("leetcode", "What is your **LeetCode URL**? _(type /skip to skip)_", False),
        ("portfolio", "What is your **Portfolio URL**? _(type /skip to skip)_", False),
        ("website", "What is your **Personal Website**? _(type /skip to skip)_", False),
    ],
}


class OnboardingAgent:
    """
    5-stage onboarding state machine.
    
    Stages:
    1. BASIC_PROFILE — Collect name, email, phone, location
    2. PROFESSIONAL_LINKS — Collect LinkedIn, GitHub, etc. (optional)
    3. RESUME_UPLOAD — Ask user to upload resume PDF
    4. RESUME_REVIEW — Show extracted data for confirmation
    5. MASTER_GENERATION — Generate master resume
    """

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def start(self, request: ChatRequest) -> ChatResponse:
        """Start or resume onboarding based on current state."""
        state = request.onboarding_state

        if not state or state.status == OnboardingStatus.NEW:
            # New user — start from scratch
            return ChatResponse(
                response=(
                    "👋 **Welcome to AI Resume Agent!**\n\n"
                    "Let's set up your professional profile. This will take just a few minutes.\n\n"
                    "I'll ask you a few questions to get started.\n\n"
                    "**Step 1 of 5: Basic Details**\n\n"
                    "What is your **full name**?"
                ),
                command="init",
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "BASIC_PROFILE",
                        "completedStages": [],
                        "currentField": "name",
                    }
                },
            )

        elif state.status == OnboardingStatus.IN_PROGRESS:
            # Resume from where they left off
            completed = [s.value for s in state.completed_stages] if state.completed_stages else []
            current = state.current_stage.value if state.current_stage else "BASIC_PROFILE"
            percentage = len(completed) * 20

            return ChatResponse(
                response=(
                    f"👋 **Welcome back!**\n\n"
                    f"Your profile setup is **{percentage}% complete**.\n\n"
                    + self._format_progress(completed, current) +
                    f"\n\nLet's continue from where you left off."
                ),
                command="init",
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": current,
                        "completedStages": completed,
                    }
                },
            )

        else:  # COMPLETED
            return ChatResponse(
                response=(
                    "✅ **Your profile is already set up!**\n\n"
                    "You can:\n"
                    "• View your profile: `/profile`\n"
                    "• Generate a resume: `/resume`\n"
                    "• Analyze a job: `/analyze`\n"
                    "• Improve your resume: `/improve`"
                ),
                command="init",
                agent_type="onboarding",
            )

    async def process(self, message: str, request: ChatRequest) -> ChatResponse:
        """Process a message during an active onboarding workflow."""
        message = message.strip()
        state = request.onboarding_state

        if not state or state.status != OnboardingStatus.IN_PROGRESS:
            return await self.start(request)

        current_stage = state.current_stage or OnboardingStage.BASIC_PROFILE
        completed = [s.value for s in state.completed_stages] if state.completed_stages else []

        # Handle /skip
        if message.lower() == "/skip":
            return await self._handle_skip(current_stage, completed, request)

        # Handle /back
        if message.lower() == "/back":
            return await self._handle_back(current_stage, completed, request)

        # Process the current field based on stage
        if current_stage == OnboardingStage.BASIC_PROFILE:
            return await self._process_basic_profile(message, completed, request)

        elif current_stage == OnboardingStage.PROFESSIONAL_LINKS:
            return await self._process_professional_links(message, completed, request)

        elif current_stage == OnboardingStage.RESUME_UPLOAD:
            # Check if the message looks like the JSON payload from the upload
            if "personalInfo" in message or "experience" in message:
                completed.append("RESUME_UPLOAD")
                
                try:
                    import json
                    parsed_resume = json.loads(message)
                except:
                    parsed_resume = {}
                
                return ChatResponse(
                    response="✅ Resume parsed successfully!\n\nPlease review the extracted information. Type **confirm** if it looks correct, or tell me what needs to be changed.",
                    agent_type="onboarding",
                    data={
                        "onboardingState": {
                            "status": "IN_PROGRESS",
                            "currentStage": "RESUME_REVIEW",
                            "completedStages": completed,
                        },
                        "parsedResume": parsed_resume
                    }
                )
            
            return ChatResponse(
                response="📄 Please upload your resume as a **PDF file** using the attachment button 📎 below.\n\n_If you don't have a resume ready, type `/skip` to create one from scratch later._",
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "RESUME_UPLOAD",
                        "completedStages": completed,
                    }
                },
                actions={"showFileUpload": True},
            )

        elif current_stage == OnboardingStage.RESUME_REVIEW:
            if message.lower() in ("confirm", "yes", "looks good", "correct"):
                # Move to master generation
                completed.append("RESUME_REVIEW")
                return ChatResponse(
                    response="✅ Resume data confirmed!\n\n⏳ Generating your master resume...",
                    agent_type="onboarding",
                    data={
                        "onboardingState": {
                            "status": "IN_PROGRESS",
                            "currentStage": "MASTER_GENERATION",
                            "completedStages": completed,
                        }
                    },
                )
            else:
                return ChatResponse(
                    response="Please review the extracted information and type **confirm** if it looks correct, or tell me what needs to be changed.",
                    agent_type="onboarding",
                )

        elif current_stage == OnboardingStage.MASTER_GENERATION:
            completed.append("MASTER_GENERATION")
            return ChatResponse(
                response=(
                    "🎉 **Your profile and master resume are ready!**\n\n"
                    "You can now:\n\n"
                    "📄 Generate a job-specific resume → `/resume`\n"
                    "🔍 Analyze a job description → `/analyze`\n"
                    "✨ Improve your resume → `/improve`"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "COMPLETED",
                        "currentStage": None,
                        "completedStages": completed,
                    }
                },
            )

        return ChatResponse(response="I'm not sure what to do here. Type `/status` to see your progress.")

    async def _process_basic_profile(
        self, message: str, completed: list, request: ChatRequest
    ) -> ChatResponse:
        """Process basic profile fields one at a time."""
        # Determine which field we're collecting based on what data we already have
        profile = request.user_profile or {}
        profile_dict = profile.model_dump() if hasattr(profile, 'model_dump') else {}

        fields = STAGE_FIELDS[OnboardingStage.BASIC_PROFILE]
        current_field = None
        for field_name, question, required in fields:
            if not profile_dict.get(field_name):
                current_field = (field_name, question, required)
                break

        if current_field is None:
            # All basic profile fields collected — move to next stage
            completed.append("BASIC_PROFILE")
            next_field = STAGE_FIELDS[OnboardingStage.PROFESSIONAL_LINKS][0]
            return ChatResponse(
                response=(
                    f"✅ **Basic details saved!**\n\n"
                    f"**Step 2 of 5: Professional Links**\n\n"
                    f"{next_field[1]}"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "PROFESSIONAL_LINKS",
                        "completedStages": completed,
                    },
                    "profileUpdate": {current_field[0]: message} if current_field else {},
                },
            )

        field_name, question, required = current_field

        # Validate and save the current field
        if required and not message:
            return ChatResponse(
                response=f"This field is required. {question}",
                agent_type="onboarding",
            )

        # Save the field value and ask for the next one
        profile_dict[field_name] = message

        # Find next field
        found_current = False
        next_field = None
        for fname, fquestion, freq in fields:
            if fname == field_name:
                found_current = True
                continue
            if found_current and not profile_dict.get(fname):
                next_field = (fname, fquestion, freq)
                break

        if next_field is None:
            # All basic profile fields done
            completed.append("BASIC_PROFILE")
            prof_link_fields = STAGE_FIELDS[OnboardingStage.PROFESSIONAL_LINKS]
            return ChatResponse(
                response=(
                    f"✅ **Basic details saved!**\n\n"
                    f"**Step 2 of 5: Professional Links**\n\n"
                    f"{prof_link_fields[0][1]}"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "PROFESSIONAL_LINKS",
                        "completedStages": completed,
                    },
                    "profileUpdate": {field_name: message},
                },
            )

        return ChatResponse(
            response=f"Got it! {next_field[1]}",
            agent_type="onboarding",
            data={
                "onboardingState": {
                    "status": "IN_PROGRESS",
                    "currentStage": "BASIC_PROFILE",
                    "completedStages": completed,
                },
                "profileUpdate": {field_name: message},
            },
        )

    async def _process_professional_links(
        self, message: str, completed: list, request: ChatRequest
    ) -> ChatResponse:
        """Process professional link fields one at a time."""
        profile = request.user_profile or {}
        profile_dict = profile.model_dump() if hasattr(profile, 'model_dump') else {}

        fields = STAGE_FIELDS[OnboardingStage.PROFESSIONAL_LINKS]
        current_field = None
        for field_name, question, required in fields:
            if profile_dict.get(field_name) is None:
                current_field = (field_name, question, required)
                break

        if current_field is None:
            # All links collected
            completed.append("PROFESSIONAL_LINKS")
            return ChatResponse(
                response=(
                    "✅ **Professional links saved!**\n\n"
                    "**Step 3 of 5: Resume Upload**\n\n"
                    "📄 Please upload your current resume as a **PDF file** using the 📎 button.\n\n"
                    "_If you don't have one ready, type `/skip` to create one from scratch later._"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "RESUME_UPLOAD",
                        "completedStages": completed,
                    }
                },
                actions={"showFileUpload": True},
            )

        field_name, question, required = current_field

        # Save the current field
        profile_dict[field_name] = message

        # Find next field
        found_current = False
        next_field = None
        for fname, fquestion, freq in fields:
            if fname == field_name:
                found_current = True
                continue
            if found_current and profile_dict.get(fname) is None:
                next_field = (fname, fquestion, freq)
                break

        if next_field is None:
            completed.append("PROFESSIONAL_LINKS")
            return ChatResponse(
                response=(
                    "✅ **Professional links saved!**\n\n"
                    "**Step 3 of 5: Resume Upload**\n\n"
                    "📄 Please upload your current resume as a **PDF file** using the 📎 button.\n\n"
                    "_If you don't have one ready, type `/skip` to create one from scratch later._"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "RESUME_UPLOAD",
                        "completedStages": completed,
                    },
                    "profileUpdate": {field_name: message},
                },
                actions={"showFileUpload": True},
            )

        return ChatResponse(
            response=f"Got it! {next_field[1]}",
            agent_type="onboarding",
            data={
                "onboardingState": {
                    "status": "IN_PROGRESS",
                    "currentStage": "PROFESSIONAL_LINKS",
                    "completedStages": completed,
                },
                "profileUpdate": {field_name: message},
            },
        )

    async def _handle_skip(
        self, current_stage: OnboardingStage, completed: list, request: ChatRequest
    ) -> ChatResponse:
        """Handle /skip — skip optional fields and move forward."""
        if current_stage == OnboardingStage.BASIC_PROFILE:
            return ChatResponse(
                response="⚠️ Basic details are required and cannot be skipped. Please provide the requested information.",
                agent_type="onboarding",
            )

        elif current_stage == OnboardingStage.PROFESSIONAL_LINKS:
            completed.append("PROFESSIONAL_LINKS")
            return ChatResponse(
                response=(
                    "No problem! You can add professional links later from your profile settings.\n\n"
                    "**Step 3 of 5: Resume Upload**\n\n"
                    "📄 Please upload your current resume as a **PDF file** using the 📎 button.\n\n"
                    "_If you don't have one ready, type `/skip` again._"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "IN_PROGRESS",
                        "currentStage": "RESUME_UPLOAD",
                        "completedStages": completed,
                    }
                },
                actions={"showFileUpload": True},
            )

        elif current_stage == OnboardingStage.RESUME_UPLOAD:
            completed.append("RESUME_UPLOAD")
            completed.append("RESUME_REVIEW")
            return ChatResponse(
                response=(
                    "No problem! You can upload your resume later.\n\n"
                    "For now, I'll mark your profile as complete. You can add resume data anytime by "
                    "uploading a PDF or manually entering your information.\n\n"
                    "🎉 **Profile setup complete!**\n\n"
                    "You can now:\n"
                    "📄 `/resume` — Generate a job-specific resume\n"
                    "🔍 `/analyze` — Analyze a job description\n"
                    "✨ `/improve` — Improve your resume"
                ),
                agent_type="onboarding",
                data={
                    "onboardingState": {
                        "status": "COMPLETED",
                        "currentStage": None,
                        "completedStages": completed + ["MASTER_GENERATION"],
                    }
                },
            )

        return ChatResponse(
            response="Nothing to skip at this point.",
            agent_type="onboarding",
        )

    async def _handle_back(
        self, current_stage: OnboardingStage, completed: list, request: ChatRequest
    ) -> ChatResponse:
        """Handle /back — go back to the previous stage."""
        current_index = STAGE_ORDER.index(current_stage) if current_stage in STAGE_ORDER else 0
        if current_index == 0:
            return ChatResponse(
                response="You're already at the first step. No previous step to go back to.",
                agent_type="onboarding",
            )

        prev_stage = STAGE_ORDER[current_index - 1]
        # Remove the previous stage from completed if it was there
        if prev_stage.value in completed:
            completed.remove(prev_stage.value)

        return ChatResponse(
            response=f"Going back to **{prev_stage.value.replace('_', ' ').title()}**.\n\nPlease provide the information again.",
            agent_type="onboarding",
            data={
                "onboardingState": {
                    "status": "IN_PROGRESS",
                    "currentStage": prev_stage.value,
                    "completedStages": completed,
                }
            },
        )

    def _format_progress(self, completed: list, current: str) -> str:
        """Format onboarding progress as a checklist."""
        stages = [
            ("Basic Details", "BASIC_PROFILE"),
            ("Professional Links", "PROFESSIONAL_LINKS"),
            ("Resume Upload", "RESUME_UPLOAD"),
            ("Resume Review", "RESUME_REVIEW"),
            ("Master Resume", "MASTER_GENERATION"),
        ]
        lines = []
        for label, value in stages:
            if value in completed:
                lines.append(f"✅ {label}")
            elif value == current:
                lines.append(f"◉ {label} _(current)_")
            else:
                lines.append(f"○ {label}")
        return "\n".join(lines)
