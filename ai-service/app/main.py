"""
AI Resume Agent — FastAPI AI Service
Main application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.llm.nvidia_provider import NvidiaLLMProvider
from app.agents.orchestrator import AgentOrchestrator
from app.agents.resume_agent import ResumeAgent
from app.agents.job_agent import JobAgent
from app.agents.match_agent import MatchAgent
from app.routers import chat, resume, job

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.app_env == "local" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # ── Startup ──────────────────────────────────────────────────────
    logger.info("Starting AI Resume Agent service...")

    # Initialize LLM provider
    llm = NvidiaLLMProvider()
    logger.info(f"LLM Provider: NVIDIA NIM ({settings.nvidia_model})")

    # Initialize agents
    orchestrator = AgentOrchestrator(llm)
    resume_agent = ResumeAgent(llm)
    job_agent = JobAgent(llm)
    match_agent = MatchAgent(llm)

    # Initialize routers with agents
    chat.init_router(orchestrator)
    resume.init_router(resume_agent, job_agent)   # job_agent needed for §18 Step A
    job.init_router(job_agent, match_agent)

    logger.info("All agents initialized successfully")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────
    logger.info("Shutting down AI Resume Agent service...")


# Create FastAPI app
app = FastAPI(
    title="AI Resume Agent — AI Service",
    description="Python AI microservice for LLM-powered resume agent operations",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Spring Boot backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(resume.router)
app.include_router(job.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-resume-agent",
        "model": settings.nvidia_model,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=settings.app_env == "local",
    )
