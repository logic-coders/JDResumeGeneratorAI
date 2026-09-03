"""
Resume Agent — handles resume parsing, optimization, and improvement.
"""

import json
import logging
from typing import Optional

from app.llm.provider import LLMProvider
from app.prompts.resume_parsing import RESUME_PARSING_SYSTEM, RESUME_PARSING_USER
from app.prompts.resume_optimization import RESUME_OPTIMIZATION_SYSTEM, RESUME_OPTIMIZATION_USER
from app.prompts.resume_improvement import RESUME_IMPROVEMENT_SYSTEM, RESUME_IMPROVEMENT_USER

logger = logging.getLogger(__name__)


class ResumeAgent:
    """Handles all resume-related AI operations."""

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def parse_resume(self, resume_text: str) -> dict:
        """Parse raw resume text into structured JSON."""
        messages = [
            {"role": "system", "content": RESUME_PARSING_SYSTEM},
            {"role": "user", "content": RESUME_PARSING_USER.format(resume_text=resume_text)},
        ]

        response = await self.llm.structured_output(messages, temperature=0.2)
        return self._extract_json(response)

    async def optimize_resume(
        self, master_resume: dict, job: dict, match_report: dict
    ) -> dict:
        """Optimize a resume for a specific job based on match analysis."""
        messages = [
            {"role": "system", "content": RESUME_OPTIMIZATION_SYSTEM},
            {"role": "user", "content": RESUME_OPTIMIZATION_USER.format(
                master_resume_json=json.dumps(master_resume, indent=2),
                job_json=json.dumps(job, indent=2),
                match_report_json=json.dumps(match_report, indent=2),
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.3)
        return self._extract_json(response)

    async def improve_resume(self, master_resume: dict, focus_area: str = "overall") -> dict:
        """Improve a master resume with suggestions."""
        messages = [
            {"role": "system", "content": RESUME_IMPROVEMENT_SYSTEM},
            {"role": "user", "content": RESUME_IMPROVEMENT_USER.format(
                resume_json=json.dumps(master_resume, indent=2),
                focus_area=focus_area,
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.4)
        return self._extract_json(response)

    def _extract_json(self, response: str) -> dict:
        """Extract JSON from LLM response, handling markdown code blocks."""
        text = response.strip()

        # Remove markdown code block if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from LLM response: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            return {"error": "Failed to parse structured output", "raw": response[:1000]}
