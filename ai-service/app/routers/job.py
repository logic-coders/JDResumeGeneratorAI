"""
Job router — handles job parsing and resume-job matching.
"""

import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatResponse, JobParseRequest, MatchRequest
from app.agents.job_agent import JobAgent
from app.agents.match_agent import MatchAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["job"])

job_agent: JobAgent = None
match_agent: MatchAgent = None


def init_router(j_agent: JobAgent, m_agent: MatchAgent):
    global job_agent, match_agent
    job_agent = j_agent
    match_agent = m_agent


@router.post("/parse-job")
async def parse_job(request: JobParseRequest) -> ChatResponse:
    """Parse job description text into structured JSON."""
    if not job_agent:
        raise HTTPException(status_code=503, detail="Job agent not initialized")

    try:
        parsed = await job_agent.parse_job(request.job_text)
        return ChatResponse(
            response="Job description parsed successfully.",
            data={"parsedJob": parsed},
        )
    except Exception as e:
        logger.error(f"Job parsing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Job parsing failed: {str(e)}")


@router.post("/match-resume")
async def match_resume(request: MatchRequest) -> ChatResponse:
    """Compare resume against job description and produce match report."""
    if not match_agent:
        raise HTTPException(status_code=503, detail="Match agent not initialized")

    try:
        report = await match_agent.match(request.resume, request.job)
        return ChatResponse(
            response="Match analysis complete.",
            data={"matchReport": report},
        )
    except Exception as e:
        logger.error(f"Match analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Match analysis failed: {str(e)}")
