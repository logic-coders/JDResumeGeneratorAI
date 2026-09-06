from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # NVIDIA NIM Configuration
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3-super-120b-a12b"

    # LLM Resilience
    llm_timeout: int = 60  # seconds per LLM call
    llm_max_retries: int = 3  # max retry attempts for transient failures

    # Application
    app_env: str = "local"
    app_port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
