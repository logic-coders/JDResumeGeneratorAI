"""
Resume router — handles resume parsing, optimization, and improvement.
"""

import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ChatResponse, ResumeParseRequest, OptimizeRequest, ImproveRequest,
)
from app.agents.resume_agent import ResumeAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["resume"])

resume_agent: ResumeAgent = None


def init_router(agent: ResumeAgent):
    global resume_agent
    resume_agent = agent


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
