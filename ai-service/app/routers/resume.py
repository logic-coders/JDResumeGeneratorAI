"""
Resume router — handles resume parsing, optimization, and improvement.

Also exposes POST /ai/generate-resume: the §18 mandatory 4-step pipeline endpoint.
"""

import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ChatResponse, ResumeParseRequest, OptimizeRequest, ImproveRequest, GenerateResumeRequest,
)
from app.agents.resume_agent import ResumeAgent
from app.agents.job_agent import JobAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["resume"])

resume_agent: ResumeAgent = None
job_agent: JobAgent = None


def init_router(agent: ResumeAgent, j_agent: JobAgent = None):
    global resume_agent, job_agent
    resume_agent = agent
    job_agent = j_agent


@router.post("/parse-resume")
async def parse_resume(request: ResumeParseRequest) -> ChatResponse:
    """Parse resume text into structured JSON."""
    if not resume_agent:
        raise HTTPException(status_code=503, detail="Resume agent not initialized")

    try:
        parsed = await resume_agent.parse_resume(request.resume_text)
        return ChatResponse(
            response="Resume parsed successfully.",
            data={"parsedResume": parsed},
        )
    except Exception as e:
        logger.error(f"Resume parsing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


@router.post("/optimize-resume")
async def optimize_resume(request: OptimizeRequest) -> ChatResponse:
    """Optimize a resume for a specific job."""
    if not resume_agent:
        raise HTTPException(status_code=503, detail="Resume agent not initialized")

    try:
        optimized = await resume_agent.optimize_resume(
            request.master_resume, request.job, request.match_report
        )
        return ChatResponse(
            response="Resume optimized successfully.",
            data={"optimizedResume": optimized},
        )
    except Exception as e:
        logger.error(f"Resume optimization error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume optimization failed: {str(e)}")


@router.post("/improve-resume")
async def improve_resume(request: ImproveRequest) -> ChatResponse:
    """Improve the master resume."""
    if not resume_agent:
        raise HTTPException(status_code=503, detail="Resume agent not initialized")

    try:
        improved = await resume_agent.improve_resume(
            request.master_resume, request.focus_area
        )
        return ChatResponse(
            response="Resume improvement suggestions ready.",
            data={"improvements": improved},
        )
    except Exception as e:
        logger.error(f"Resume improvement error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume improvement failed: {str(e)}")


@router.post("/generate-resume")
async def generate_resume(request: GenerateResumeRequest) -> ChatResponse:
    """
    §18 Mandatory 4-Step Resume Generation Pipeline.

    Runs Steps A → B → C → D for every call — no caching, no re-use of prior selections.

    Step A: Extract Target Role from the job JSON (JobAgent).
    Step B: Score the full verified pool and select the best subset (ResumeAgent).
    Step C: Rewrite bullet points to match this role's emphasis (ResumeAgent).
    Step D: Build a JD-scoped skills section (ResumeAgent).

    §18.5 Regression checks:
    - Byte-identity check: rejects generation if fingerprint matches previousResumeFingerprint.
    - Skills-copy check: rejects generation if Step D produces the master skill list unchanged.

    Returns:
        generatedResume, targetRole, resumeFingerprint, pipelineSteps audit data.
    """
    if not resume_agent:
        raise HTTPException(status_code=503, detail="Resume agent not initialized")
    if not job_agent:
        raise HTTPException(status_code=503, detail="Job agent not initialized (required for Step A)")

    try:
        # ━━ Step A: Extract Target Role — MANDATORY, non-skippable ━━━━━━━━━━━━━━━
        # If this raises, the pipeline stops here. We do NOT fall back to
        # reusing the master resume or a prior selection.
        target_role = await job_agent.extract_target_role(request.job)

        # ━━ Steps B → C → D + §18.5 checks ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        result = await resume_agent.generate_resume_pipeline(
            master_resume=request.master_resume,
            job=request.job,
            match_report=request.match_report,
            target_role=target_role,
            previous_resume_fingerprint=request.previous_resume_fingerprint,
        )

        role = result["targetRole"]
        return ChatResponse(
            response=(
                f"✅ Resume generated for **{role.get('jobTitle', 'the role')}** "
                f"({role.get('seniority', '')} {role.get('domain', '')}).\n"
                f"Fingerprint: `{result['resumeFingerprint'][:12]}...`"
            ),
            data=result,
        )

    except RuntimeError as e:
        # Pipeline step failures (Step A terminal, or §18.5 regression violations)
        error_msg = str(e)
        logger.error(f"Resume pipeline error: {error_msg}")
        status_code = 409 if "§18.5" in error_msg else 422
        raise HTTPException(status_code=status_code, detail=error_msg)
    except Exception as e:
        logger.error(f"Resume generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {str(e)}")
