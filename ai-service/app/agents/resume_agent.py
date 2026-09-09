"""
Resume Agent — handles resume parsing, optimization, and improvement.

§18 Mandatory 4-Step Pipeline (run fresh for every job):
  Step A — extract_target_role()  [on JobAgent]
  Step B — select_content()       reranks entire verified pool against this role
  Step C — rewrite_bullets()      reframes bullets for this role's emphasis
  Step D — build_skills_section() builds skills ONLY from JD required/preferred skills the user has
  §18.5  — regression checks inside generate_resume_pipeline()
"""

import hashlib
import json
import logging
from typing import Optional

from app.llm.provider import LLMProvider
from app.prompts.resume_parsing import RESUME_PARSING_SYSTEM, RESUME_PARSING_USER
from app.prompts.resume_optimization import (
    RESUME_OPTIMIZATION_SYSTEM, RESUME_OPTIMIZATION_USER,  # legacy single-shot
    CONTENT_SELECTION_SYSTEM, CONTENT_SELECTION_USER,       # Step B
    BULLET_REWRITE_SYSTEM, BULLET_REWRITE_USER,             # Step C
    SKILLS_BUILD_SYSTEM, SKILLS_BUILD_USER,                 # Step D
)
from app.prompts.resume_improvement import RESUME_IMPROVEMENT_SYSTEM, RESUME_IMPROVEMENT_USER

logger = logging.getLogger(__name__)


class ResumeAgent:
    """Handles all resume-related AI operations."""

    def __init__(self, llm: LLMProvider):
        self.llm = llm

    # ─────────────────────────────────────────────────────────────────────────
    # Existing methods (unchanged — backward compat)
    # ─────────────────────────────────────────────────────────────────────────

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
        """
        [LEGACY] Single-shot resume optimizer — kept for backward compat.
        For new integrations, use generate_resume_pipeline() instead.
        """
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

    # ─────────────────────────────────────────────────────────────────────────
    # §18 Pipeline — Steps B, C, D
    # ─────────────────────────────────────────────────────────────────────────

    async def select_content(self, master_resume: dict, target_role: dict) -> dict:
        """
        §18 Step B — Select Experience & Projects.

        Scores the ENTIRE verified pool against the target role and returns
        a ranked subset. Never reuses a prior job's selection — the target_role
        dict from Step A is the sole selection criterion.

        Args:
            master_resume: The full verified master resume JSON.
            target_role:   The TargetRole dict from Step A.

        Returns:
            Selection dict with selectedExperience, selectedProjects, droppedEntries.
        """
        logger.info("[Step B] Selecting experience & projects for role: %s",
                    target_role.get("jobTitle", "?"))
        messages = [
            {"role": "system", "content": CONTENT_SELECTION_SYSTEM},
            {"role": "user", "content": CONTENT_SELECTION_USER.format(
                target_role_json=json.dumps(target_role, indent=2),
                master_resume_json=json.dumps(master_resume, indent=2),
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.2)
        result = self._extract_json(response)
        if "error" in result:
            logger.error("[Step B] Content selection failed: %s", result.get("error"))
            raise RuntimeError(f"Step B (content selection) failed: {result.get('error')}")

        dropped = result.get("droppedEntries", [])
        logger.info("[Step B] Selected %d experience, %d projects; dropped: %s",
                    len(result.get("selectedExperience", [])),
                    len(result.get("selectedProjects", [])),
                    dropped)
        return result

    async def rewrite_bullets(self, selected_content: dict, target_role: dict) -> dict:
        """
        §18 Step C — Rewrite Bullet Points.

        Reframes each selected entry's bullets toward this role's emphasis.
        Facts (dates, numbers, metrics) are immutable. No new bullets may be added.

        Args:
            selected_content: The output of Step B (selectedExperience + selectedProjects).
            target_role:      The TargetRole dict from Step A.

        Returns:
            Dict with rewrittenExperience and rewrittenProjects.
        """
        logger.info("[Step C] Rewriting bullets for role: %s",
                    target_role.get("jobTitle", "?"))
        messages = [
            {"role": "system", "content": BULLET_REWRITE_SYSTEM},
            {"role": "user", "content": BULLET_REWRITE_USER.format(
                target_role_json=json.dumps(target_role, indent=2),
                selected_content_json=json.dumps(selected_content, indent=2),
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.35)
        result = self._extract_json(response)
        if "error" in result:
            logger.error("[Step C] Bullet rewriting failed: %s", result.get("error"))
            raise RuntimeError(f"Step C (bullet rewriting) failed: {result.get('error')}")

        logger.info("[Step C] Rewrote %d experience, %d projects",
                    len(result.get("rewrittenExperience", [])),
                    len(result.get("rewrittenProjects", [])))
        return result

    async def build_skills_section(self, master_resume: dict, target_role: dict) -> dict:
        """
        §18 Step D — Build the Skills Section from the JD.

        Only includes JD's required/preferred skills that the user actually has,
        plus at most 1–2 closely related skills from their verified pool.
        Never dumps the full master skill list.

        Args:
            master_resume: The full verified master resume JSON (for the skills pool).
            target_role:   The TargetRole dict from Step A.

        Returns:
            Dict with skills (categorized), includedSkills, excludedFromMaster, buildRationale.
        """
        logger.info("[Step D] Building JD-scoped skills section for role: %s",
                    target_role.get("jobTitle", "?"))

        master_skills = master_resume.get("skills", {})
        messages = [
            {"role": "system", "content": SKILLS_BUILD_SYSTEM},
            {"role": "user", "content": SKILLS_BUILD_USER.format(
                target_role_json=json.dumps(target_role, indent=2),
                master_skills_json=json.dumps(master_skills, indent=2),
            )},
        ]

        response = await self.llm.structured_output(messages, temperature=0.1)
        result = self._extract_json(response)
        if "error" in result:
            logger.error("[Step D] Skills section build failed: %s", result.get("error"))
            raise RuntimeError(f"Step D (skills section build) failed: {result.get('error')}")

        # §18.5 check: if the built skills == master skills, the prompt failed.
        built_skills = result.get("skills", {})
        if self._skills_match_master(built_skills, master_skills):
            logger.error(
                "[Step D] §18.5 VIOLATION: built skills section is identical to master skill list. "
                "Aborting — the full master list must not be dumped on every resume."
            )
            raise RuntimeError(
                "Step D §18.5 regression: generated skills section is identical to the master "
                "skill list. The JD-scoped build constraint was not respected. Generation aborted."
            )

        excluded = result.get("excludedFromMaster", [])
        extras = result.get("closelRelatedExtras", [])
        logger.info("[Step D] Skills built. Excluded %d master skills; added %d related extras.",
                    len(excluded), len(extras))
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # §18 Pipeline Orchestrator + §18.5 Regression Checks
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_resume_pipeline(
        self,
        master_resume: dict,
        job: dict,
        match_report: dict,
        target_role: dict,
        previous_resume_fingerprint: Optional[str] = None,
    ) -> dict:
        """
        §18 Mandatory 4-Step Resume Generation Pipeline.

        Runs Steps B → C → D in sequence using the target_role from Step A.
        Step A is run by the caller (JobAgent.extract_target_role) before invoking this.

        §18.5 Regression Checks:
        1. Byte-identity check: if the generated resume fingerprint matches
           previous_resume_fingerprint, generation is rejected.
        2. Skills-copy check: enforced inside build_skills_section (Step D).

        Args:
            master_resume:               Full verified master resume JSON.
            job:                         Structured job JSON.
            match_report:                Match report from MatchAgent.
            target_role:                 TargetRole dict from Step A (JobAgent).
            previous_resume_fingerprint: SHA-256 of the last generated resume for this user.
                                         Pass None to skip the byte-identity check.

        Returns:
            dict with keys:
              - generatedResume:    The assembled job-specific resume JSON.
              - targetRole:         The TargetRole used (from Step A).
              - pipelineSteps:      Per-step outputs for audit/debug.
              - resumeFingerprint:  SHA-256 of the generated resume (store this for next call).
        """
        logger.info("=== §18 Resume Generation Pipeline START: %s ===",
                    target_role.get("jobTitle", "unknown"))

        # ── Step B: Select content ────────────────────────────────────────────
        logger.info("--- Pipeline Step B: Content Selection ---")
        selection = await self.select_content(master_resume, target_role)

        # ── Step C: Rewrite bullets ───────────────────────────────────────────
        logger.info("--- Pipeline Step C: Bullet Rewriting ---")
        rewritten = await self.rewrite_bullets(selection, target_role)

        # ── Step D: Build skills section ──────────────────────────────────────
        logger.info("--- Pipeline Step D: Skills Section Build ---")
        skills_result = await self.build_skills_section(master_resume, target_role)

        # ── Assemble the final resume ─────────────────────────────────────────
        generated_resume = self._assemble_resume(
            master_resume=master_resume,
            rewritten=rewritten,
            skills_result=skills_result,
            target_role=target_role,
        )

        # ── §18.5 Byte-identity check ─────────────────────────────────────────
        fingerprint = self._compute_fingerprint(generated_resume)
        if previous_resume_fingerprint and fingerprint == previous_resume_fingerprint:
            logger.error(
                "[§18.5] VIOLATION: generated resume is byte-identical to the previous resume "
                "for a different role (fingerprint: %s). Generation rejected.", fingerprint
            )
            raise RuntimeError(
                "§18.5 regression: the generated resume is byte-identical to the previous "
                "generated resume. This indicates the content selection is not role-specific. "
                "Generation rejected to prevent duplicate resumes."
            )

        logger.info("=== §18 Pipeline COMPLETE: fingerprint=%s ===", fingerprint[:12])

        return {
            "generatedResume": generated_resume,
            "targetRole": target_role,
            "resumeFingerprint": fingerprint,
            "pipelineSteps": {
                "stepB_selection": {
                    "selectionRationale": selection.get("selectionRationale", ""),
                    "selectedExperienceCount": len(selection.get("selectedExperience", [])),
                    "selectedProjectsCount": len(selection.get("selectedProjects", [])),
                    "droppedEntries": selection.get("droppedEntries", []),
                },
                "stepC_rewriting": {
                    "rewrittenExperienceCount": len(rewritten.get("rewrittenExperience", [])),
                    "rewrittenProjectsCount": len(rewritten.get("rewrittenProjects", [])),
                },
                "stepD_skills": {
                    "includedSkills": skills_result.get("includedSkills", []),
                    "excludedFromMaster": skills_result.get("excludedFromMaster", []),
                    "closelRelatedExtras": skills_result.get("closelRelatedExtras", []),
                    "buildRationale": skills_result.get("buildRationale", ""),
                },
            },
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _assemble_resume(
        self,
        master_resume: dict,
        rewritten: dict,
        skills_result: dict,
        target_role: dict,
    ) -> dict:
        """
        Assemble the final job-specific resume from Step C and Step D outputs.
        All other fields (personal_info, education, certifications, achievements,
        summary) are carried from the master resume unchanged.
        """
        # Start from master (for all non-mutated fields)
        resume = dict(master_resume)

        # Apply Step C: rewritten experience
        if rewritten.get("rewrittenExperience"):
            resume["experience"] = rewritten["rewrittenExperience"]
        elif rewritten.get("rewrittenProjects"):
            # At minimum update projects if experience wasn't in the original
            pass

        # Apply Step C: rewritten projects
        if rewritten.get("rewrittenProjects"):
            resume["projects"] = rewritten["rewrittenProjects"]

        # Apply Step D: JD-scoped skills section
        if skills_result.get("skills"):
            resume["skills"] = skills_result["skills"]

        # Update summary to reflect target role (use existing summary as base;
        # the system prompt from Step C handles this implicitly via keyword integration)
        # We preserve the master summary here — future improvement: add Step E for summary.

        return resume

    def _compute_fingerprint(self, resume: dict) -> str:
        """
        §18.5 — Compute a stable SHA-256 fingerprint of a resume dict.
        Keys are sorted and null values are normalized for stability.
        """
        normalized = json.dumps(resume, sort_keys=True, ensure_ascii=False, default=str)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _skills_match_master(self, built_skills: dict, master_skills: dict) -> bool:
        """
        §18.5 — Check if the built skills section is identical to the master skill list.
        Returns True (violation) if they match exactly across all categories.
        """
        if not master_skills or not built_skills:
            return False

        categories = ["languages", "frameworks", "databases", "cloud", "tools"]
        for cat in categories:
            built_cat = sorted(built_skills.get(cat, []))
            master_cat = sorted(master_skills.get(cat, []))
            if built_cat != master_cat:
                return False  # They differ — not a violation

        # All categories are identical → violation
        return True

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
