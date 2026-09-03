"""
NVIDIA NIM LLM Provider implementation.
Uses the OpenAI-compatible SDK to communicate with NVIDIA's NIM API.
"""

import logging
from typing import AsyncIterator, Optional

from openai import AsyncOpenAI

from app.config import settings
from app.llm.provider import LLMProvider

logger = logging.getLogger(__name__)


class NvidiaLLMProvider(LLMProvider):
    """
    NVIDIA NIM LLM Provider using OpenAI-compatible API.
    The NVIDIA NIM API is fully compatible with the OpenAI SDK.
    """

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
        )
        self.model = settings.nvidia_model
        logger.info(f"NVIDIA LLM Provider initialized: model={self.model}, base_url={settings.nvidia_base_url}")

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Generate a complete chat response."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content
            logger.debug(f"LLM response ({len(content)} chars): {content[:100]}...")
            return content
        except Exception as e:
            logger.error(f"LLM chat error: {e}")
            raise

    async def chat_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """Stream a chat response chunk by chunk."""
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
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
        """Generate structured JSON output with lower temperature."""
        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            # Some models support response_format for JSON mode
            if response_format:
                kwargs["response_format"] = response_format

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            logger.debug(f"LLM structured output ({len(content)} chars)")
            return content
        except Exception as e:
            logger.error(f"LLM structured output error: {e}")
            raise
