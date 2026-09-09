"""
Job Agent — handles job description parsing.

Now also handles §18 Step A: extracting a structured TargetRole from the parsed job JSON.
Step A MUST succeed before any downstream resume generation step runs.
"""

import json
import logging

from app.llm.provider import LLMProvider
from app.prompts.job_parsing import JOB_PARSING_SYSTEM, JOB_PARSING_USER
from app.prompts.role_extraction import ROLE_EXTRACTION_SYSTEM, ROLE_EXTRACTION_USER

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

    async def extract_target_role(self, job: dict) -> dict:
        """
        §18 Step A — Extract Target Role from a structured job JSON.

        This is the MANDATORY first step of the resume generation pipeline.
        Returns a TargetRole dict with jobTitle, seniority, domain, requiredSkills,
        preferredSkills, keyResponsibilities, and ATS keywords.

        If this step fails, generation must stop — never fall back to
        using the master resume without a target role.

        Raises:
            RuntimeError: if the LLM call fails or returns unparseable output.
        """
        logger.info("[Step A] Extracting target role from job JSON")
        messages = [
            {"role": "system", "content": ROLE_EXTRACTION_SYSTEM},
            {"role": "user", "content": ROLE_EXTRACTION_USER.format(
                job_json=json.dumps(job, indent=2)
            )},
        ]

        try:
            response = await self.llm.structured_output(messages, temperature=0.1)
            target_role = self._extract_json(response)
            if "error" in target_role:
                raise RuntimeError(
                    f"[Step A] Target role extraction returned an error: {target_role.get('error')}"
                )
            logger.info(
                f"[Step A] Extracted role: {target_role.get('jobTitle', '?')} "
                f"({target_role.get('seniority', '?')}, {target_role.get('domain', '?')})"
            )
            return target_role
        except Exception as e:
            # Step A failure is terminal — raise so the pipeline stops.
            logger.error(f"[Step A] FATAL: target role extraction failed: {e}")
            raise RuntimeError(f"Step A (target role extraction) failed: {e}") from e

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
