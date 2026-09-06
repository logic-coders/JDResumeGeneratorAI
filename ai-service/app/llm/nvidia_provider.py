"""
NVIDIA NIM LLM Provider implementation.
Uses the OpenAI-compatible SDK to communicate with NVIDIA's NIM API.
Includes retry logic with exponential backoff for resilience.
"""

import logging
from typing import AsyncIterator, Optional

from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, RateLimitError, APIStatusError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.config import settings
from app.llm.provider import LLMProvider

logger = logging.getLogger(__name__)

# Define which exceptions should trigger a retry
RETRYABLE_EXCEPTIONS = (
    APITimeoutError,
    APIConnectionError,
    RateLimitError,
)


def _is_retryable_status_error(exc: BaseException) -> bool:
    """Check if an APIStatusError is retryable (5xx server errors)."""
    if isinstance(exc, APIStatusError):
        return exc.status_code >= 500
    return False


def _should_retry(exc: BaseException) -> bool:
    """Combined retry condition: retryable exceptions OR 5xx status errors."""
    if isinstance(exc, RETRYABLE_EXCEPTIONS):
        return True
    return _is_retryable_status_error(exc)


class NvidiaLLMProvider(LLMProvider):
    """
    NVIDIA NIM LLM Provider using OpenAI-compatible API.
    The NVIDIA NIM API is fully compatible with the OpenAI SDK.
    
    Resilience features:
    - Retry with exponential backoff on transient failures
    - Configurable timeout per request
    - Graceful error logging before each retry
    """

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
            timeout=settings.llm_timeout,
        )
        self.model = settings.nvidia_model
        self.max_retries = settings.llm_max_retries
        logger.info(
            f"NVIDIA LLM Provider initialized: model={self.model}, "
            f"base_url={settings.nvidia_base_url}, "
            f"timeout={settings.llm_timeout}s, max_retries={self.max_retries}"
        )

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Generate a complete chat response with retry logic."""
        @retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=30),
            retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        )
        async def _call():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content
            logger.debug(f"LLM response ({len(content)} chars): {content[:100]}...")
            return content

        try:
            return await _call()
        except RETRYABLE_EXCEPTIONS as e:
            logger.error(f"LLM chat failed after {self.max_retries} retries: {e}")
            raise
        except Exception as e:
            logger.error(f"LLM chat error (non-retryable): {e}")
            raise

    async def chat_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """Stream a chat response chunk by chunk with retry on initial connection."""
        @retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=30),
            retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        )
        async def _create_stream():
            return await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

        try:
            stream = await _create_stream()
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except RETRYABLE_EXCEPTIONS as e:
            logger.error(f"LLM stream failed after retries: {e}")
            raise
        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            raise

    async def structured_output(
        self,
        messages: list[dict],
        response_format: Optional[dict] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """Generate structured JSON output with retry logic and lower temperature."""
        @retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=30),
            retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        )
        async def _call():
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            # Default to JSON mode for structured output to constrain LLM to pure JSON and prevent reasoning timeouts
            fmt = response_format if response_format is not None else {"type": "json_object"}
            kwargs["response_format"] = fmt

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            logger.debug(f"LLM structured output ({len(content)} chars)")
            return content

        try:
            return await _call()
        except RETRYABLE_EXCEPTIONS as e:
            logger.error(f"LLM structured output failed after {self.max_retries} retries: {e}")
            raise
        except Exception as e:
            logger.error(f"LLM structured output error (non-retryable): {e}")
            raise
