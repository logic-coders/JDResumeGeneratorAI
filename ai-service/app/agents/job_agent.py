"""
Job Agent — handles job description parsing.
"""

import json
import logging

from app.llm.provider import LLMProvider
from app.prompts.job_parsing import JOB_PARSING_SYSTEM, JOB_PARSING_USER

logger = logging.getLogger(__name__)


class JobAgent:
    """Handles job description AI operations."""

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def parse_job(self, job_text: str) -> dict:
        """Parse raw job description text into structured JSON."""
        messages = [
            {"role": "system", "content": JOB_PARSING_SYSTEM},
            {"role": "user", "content": JOB_PARSING_USER.format(job_text=job_text)},
        ]

        response = await self.llm.structured_output(messages, temperature=0.2)
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
            logger.error(f"Failed to parse job JSON: {e}")
            return {"error": "Failed to parse job description", "raw": response[:1000]}
