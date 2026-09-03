"""
Chat router — handles chat messages and intent detection.
"""

import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.agents.orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["chat"])

# Will be initialized in main.py startup
orchestrator: AgentOrchestrator = None


def init_router(orch: AgentOrchestrator):
    """Initialize the router with the agent orchestrator."""
    global orchestrator
    orchestrator = orch


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message through the agent orchestrator."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="AI service not initialized")

    try:
        response = await orchestrator.process(request)
        return response
    except Exception as e:
        logger.error(f"Chat processing error: {e}", exc_info=True)
        return ChatResponse(
            response="I'm sorry, I encountered an error processing your request. Please try again.",
        )
