"""
Match Agent — compares resume vs job and produces a match report.
"""

import json
import logging

from app.llm.provider import LLMProvider
from app.prompts.resume_matching import RESUME_MATCHING_SYSTEM, RESUME_MATCHING_USER

logger = logging.getLogger(__name__)


class MatchAgent:
    """Handles resume-job matching analysis."""

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def match(self, resume: dict, job: dict) -> dict:
        """Compare a resume against a job description and produce a match report."""
        messages = [
            {"role": "system", "content": RESUME_MATCHING_SYSTEM},
            {"role": "user", "content": RESUME_MATCHING_USER.format(
                resume_json=json.dumps(resume, indent=2),
                job_json=json.dumps(job, indent=2),
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.3)
        return self._extract_json(response)

    def _extract_json(self, response: str) -> dict:
        """Extract JSON from LLM response."""
        text = response.strip()
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
            logger.error(f"Failed to parse match report JSON: {e}")
            return {"error": "Failed to generate match report", "raw": response[:1000]}
