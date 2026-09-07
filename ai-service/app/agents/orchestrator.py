"""
Agent Orchestrator — the central brain of the AI service.
Routes user messages to the appropriate agent based on slash commands or intent detection.
"""

import json
import logging
from typing import Optional

from app.llm.provider import LLMProvider
from app.models.schemas import (
    ChatRequest, ChatResponse, Intent, OnboardingStatus,
)
from app.prompts.intent_detection import INTENT_DETECTION_SYSTEM, INTENT_DETECTION_USER
from app.prompts.conversational import SYSTEM_PERSONA
from app.agents.onboarding_agent import OnboardingAgent

logger = logging.getLogger(__name__)

# Slash command to intent mapping
SLASH_COMMANDS = {
    "/init": Intent.INIT,
    "/profile": Intent.PROFILE,
    "/resume": Intent.RESUME,
    "/analyze": Intent.ANALYZE,
    "/improve": Intent.IMPROVE,
    "/status": Intent.STATUS,
    "/help": Intent.HELP,
    "/cancel": Intent.CANCEL,
    "/skip": Intent.SKIP,
    "/back": Intent.BACK,
}


class AgentOrchestrator:
    """
    Routes user messages to the appropriate agent.
    
    Flow:
    1. Check if message is a slash command → route to command handler
    2. Check if there's an active workflow → continue it
    3. Otherwise, detect intent via LLM → route to appropriate agent
    """

    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.onboarding_agent = OnboardingAgent(llm)

    async def process(self, request: ChatRequest) -> ChatResponse:
        """Process a user message and return an AI response."""
        message = request.message.strip()
        logger.info(f"Processing message: {message[:100]}")

        # 1. Check for slash command
        command = self._detect_slash_command(message)
        if command:
            return await self._handle_command(command, message, request)

        # 2. Check for active onboarding workflow
        if (request.onboarding_state and
                request.onboarding_state.status == OnboardingStatus.IN_PROGRESS):
            return await self.onboarding_agent.process(message, request)

        # 3. Detect intent via LLM
        intent = await self._detect_intent(message)
        return await self._route_to_agent(intent, message, request)

    def _detect_slash_command(self, message: str) -> Optional[Intent]:
        """Check if the message starts with a slash command."""
        first_word = message.split()[0].lower() if message.split() else ""
        return SLASH_COMMANDS.get(first_word)

    async def _detect_intent(self, message: str) -> Intent:
        """Use LLM to detect the user's intent from natural language."""
        try:
            messages = [
                {"role": "system", "content": INTENT_DETECTION_SYSTEM},
                {"role": "user", "content": INTENT_DETECTION_USER.format(message=message)},
            ]
            response = await self.llm.chat(messages, temperature=0.1, max_tokens=50)
            intent_str = response.strip().lower().strip('"').strip("'")

            # Map to Intent enum
            try:
                return Intent(intent_str)
            except ValueError:
                logger.warning(f"Unknown intent detected: {intent_str}")
                return Intent.GENERAL_CHAT
        except Exception as e:
            logger.error(f"Intent detection failed: {e}")
            return Intent.GENERAL_CHAT

    async def _handle_command(
        self, command: Intent, message: str, request: ChatRequest
    ) -> ChatResponse:
        """Route a slash command to the appropriate handler."""
        logger.info(f"Handling command: {command}")

        if command == Intent.INIT:
            return await self.onboarding_agent.start(request)

        elif command == Intent.PROFILE:
            return await self._handle_profile(request)

        elif command == Intent.STATUS:
            return await self._handle_status(request)

        elif command == Intent.HELP:
            return self._handle_help()

        elif command == Intent.CANCEL:
            return ChatResponse(
                response="✅ Current workflow cancelled. How can I help you?",
                command="cancel",
            )

        elif command in (Intent.SKIP, Intent.BACK):
            # These are handled within active workflows
            if (request.onboarding_state and
                    request.onboarding_state.status == OnboardingStatus.IN_PROGRESS):
                return await self.onboarding_agent.process(message, request)
            return ChatResponse(
                response="No active workflow to apply this command to. Type `/help` to see available commands.",
                command=command.value,
            )

        elif command in (Intent.RESUME, Intent.ANALYZE, Intent.IMPROVE):
            # Check if onboarding is complete
            if not self._is_onboarded(request):
                return ChatResponse(
                    response="⚠️ Please complete your profile setup first.\n\nType `/init` or click the button below to get started.",
                    command=command.value,
                    actions={"showButton": {"label": "Set Up My Profile", "command": "/init"}},
                )
            return await self._route_to_agent(command, message, request)

        return ChatResponse(response="Unknown command. Type `/help` to see available commands.")

    async def _route_to_agent(
        self, intent: Intent, message: str, request: ChatRequest
    ) -> ChatResponse:
        """Route to the appropriate agent based on detected intent."""
        logger.info(f"Routing to agent for intent: {intent}")

        if intent == Intent.INIT:
            return await self.onboarding_agent.start(request)

        elif intent == Intent.GENERAL_CHAT:
            return await self._handle_general_chat(message, request)

        elif intent == Intent.HELP:
            return self._handle_help()

        elif intent == Intent.STATUS:
            return await self._handle_status(request)

        elif intent == Intent.PROFILE:
            return await self._handle_profile(request)

        elif intent in (Intent.RESUME, Intent.ANALYZE, Intent.IMPROVE):
            if not self._is_onboarded(request):
                return ChatResponse(
                    response="⚠️ Please complete your profile setup first before using advanced features.\n\nType `/init` to get started!",
                    intent=intent.value,
                    actions={"showButton": {"label": "Set Up My Profile", "command": "/init"}},
                )
            # Extract URLs from the message to pass to frontend
            import re
            urls = re.findall(r'(https?://\S+)', message)
            job_url = urls[0] if urls else None
            
            data = {}
            if job_url:
                data["jobUrl"] = job_url

            if intent == Intent.ANALYZE:
                if job_url:
                    return ChatResponse(
                        response=f"🔍 Analyzing your resume against the job description at {job_url}...",
                        intent=intent.value,
                        data=data,
                        actions={"triggerApi": "/api/resumes/analyze"}
                    )
                else:
                    return ChatResponse(
                        response="Please provide a job URL to analyze. Example: `/analyze https://company.com/job/123`",
                        intent=intent.value,
                    )
            elif intent == Intent.RESUME:
                if job_url:
                    return ChatResponse(
                        response=f"⚙️ Generating a customized resume for the job at {job_url}...",
                        intent=intent.value,
                        data=data,
                        actions={"triggerApi": "/api/resumes/generate"}
                    )
                else:
                    return ChatResponse(
                        response="Please provide a job URL to generate a custom resume. Example: `/resume https://company.com/job/123`",
                        intent=intent.value,
                    )
            elif intent == Intent.IMPROVE:
                return ChatResponse(
                    response="✨ Improving your master resume...",
                    intent=intent.value,
                    actions={"triggerApi": "/api/resumes/improve"}
                )

        return await self._handle_general_chat(message, request)

    async def _handle_general_chat(self, message: str, request: ChatRequest) -> ChatResponse:
        """Handle general conversation using the LLM."""
        messages = [{"role": "system", "content": SYSTEM_PERSONA}]

        # Add conversation history
        if request.conversation_history:
            for msg in request.conversation_history[-10:]:
                messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": message})

        try:
            response = await self.llm.chat(messages, temperature=0.7)
            return ChatResponse(
                response=response,
                intent="general_chat",
            )
        except Exception as e:
            logger.error(f"General chat failed: {e}")
            return ChatResponse(
                response="I'm sorry, I'm having trouble responding right now. Please try again.",
                intent="general_chat",
            )

    async def _handle_profile(self, request: ChatRequest) -> ChatResponse:
        """Handle /profile command — show current profile with resume sections."""
        profile = request.user_profile
        if not profile or not profile.name:
            return ChatResponse(
                response="You haven't set up your profile yet. Type `/init` to get started!",
                command="profile",
                actions={"showButton": {"label": "Set Up My Profile", "command": "/init"}},
            )

        lines = ["📋 **Your Profile**\n"]
        if profile.name: lines.append(f"**Name:** {profile.name}")
        if profile.email: lines.append(f"**Email:** {profile.email}")
        if profile.phone: lines.append(f"**Phone:** {profile.phone}")
        if profile.location: lines.append(f"**Location:** {profile.location}")
        if profile.linkedin: lines.append(f"**LinkedIn:** {profile.linkedin}")
        if profile.github: lines.append(f"**GitHub:** {profile.github}")
        if profile.leetcode: lines.append(f"**LeetCode:** {profile.leetcode}")
        if profile.portfolio: lines.append(f"**Portfolio:** {profile.portfolio}")
        if profile.website: lines.append(f"**Website:** {profile.website}")

        # Show resume data summary if available
        resume = request.master_resume
        if resume:
            lines.append("\n---\n📄 **Resume Data**\n")
            exp = resume.experience if hasattr(resume, 'experience') and resume.experience else []
            proj = resume.projects if hasattr(resume, 'projects') and resume.projects else []
            edu = resume.education if hasattr(resume, 'education') and resume.education else []
            certs = resume.certifications if hasattr(resume, 'certifications') and resume.certifications else []
            achv = resume.achievements if hasattr(resume, 'achievements') and resume.achievements else []
            skills = resume.skills

            lines.append(f"**Experience:** {len(exp)} entries")
            for e in exp[:3]:  # show first 3
                company = getattr(e, 'company', None) or 'Unknown'
                title = getattr(e, 'title', None) or ''
                lines.append(f"  • {company} — {title}")
            if len(exp) > 3:
                lines.append(f"  _...and {len(exp) - 3} more_")

            lines.append(f"**Projects:** {len(proj)} entries")
            for p in proj[:3]:
                name = getattr(p, 'name', None) or 'Unnamed'
                lines.append(f"  • {name}")
            if len(proj) > 3:
                lines.append(f"  _...and {len(proj) - 3} more_")

            if skills:
                skill_items = []
                for cat in ['languages', 'frameworks', 'databases', 'cloud', 'tools']:
                    items = getattr(skills, cat, []) or []
                    if items:
                        skill_items.extend(items[:3])
                if skill_items:
                    lines.append(f"**Skills:** {', '.join(skill_items[:8])}{'...' if len(skill_items) > 8 else ''}")

            lines.append(f"**Education:** {len(edu)} entries")
            lines.append(f"**Certifications:** {len(certs)}")
            lines.append(f"**Achievements:** {len(achv)}")

        lines.append("\n_You can update any field by telling me what to change, or use the profile editor in the sidebar._")

        return ChatResponse(
            response="\n".join(lines),
            command="profile",
        )

    async def _handle_status(self, request: ChatRequest) -> ChatResponse:
        """Handle /status command — show onboarding progress."""
        state = request.onboarding_state
        if not state:
            return ChatResponse(
                response="No onboarding in progress. Type `/init` to get started!",
                command="status",
            )

        stages = [
            ("Basic Details", "BASIC_PROFILE"),
            ("Professional Links", "PROFESSIONAL_LINKS"),
            ("Resume Upload", "RESUME_UPLOAD"),
            ("Resume Review", "RESUME_REVIEW"),
            ("Master Resume Generation", "MASTER_GENERATION"),
        ]

        completed = [s.value for s in state.completed_stages] if state.completed_stages else []
        current = state.current_stage.value if state.current_stage else None

        lines = [f"📊 **Profile Setup: {state.status.value}**\n"]
        for label, stage_value in stages:
            if stage_value in completed:
                lines.append(f"✅ {label}")
            elif stage_value == current:
                lines.append(f"◉ {label} _(in progress)_")
            else:
                lines.append(f"○ {label}")

        percentage = len(completed) * 20
        lines.append(f"\n**Progress:** {percentage}% complete")

        return ChatResponse(
            response="\n".join(lines),
            command="status",
        )

    def _handle_help(self) -> ChatResponse:
        """Handle /help command — show available commands."""
        help_text = """🤖 **Available Commands**

**Setup**
• `/init` — Start or continue profile setup
• `/profile` — View or update your profile
• `/status` — Check setup progress

**Resume**
• `/resume` — Generate a job-specific resume
• `/analyze` — Analyze resume compatibility with a job
• `/improve` — Improve your master resume

**Utility**
• `/help` — Show this help message
• `/cancel` — Cancel the current workflow

**During Onboarding**
• `/skip` — Skip an optional field
• `/back` — Go back to the previous step

💡 _You can also just chat naturally! I'll understand what you need._"""

        return ChatResponse(response=help_text, command="help")

    def _is_onboarded(self, request: ChatRequest) -> bool:
        """Check if the user has completed onboarding."""
        return (request.onboarding_state and
                request.onboarding_state.status == OnboardingStatus.COMPLETED)
