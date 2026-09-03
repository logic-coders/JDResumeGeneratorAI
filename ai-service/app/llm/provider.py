"""
Abstract LLM Provider interface.
All LLM providers must implement this interface to ensure
the business logic is decoupled from any specific provider.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """
        Generate a chat response from the LLM.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature (0.0 - 1.0).
            max_tokens: Maximum tokens in the response.

        Returns:
            The generated text response.
        """
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """
        Stream a chat response from the LLM.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in the response.

        Yields:
            Text chunks as they are generated.
        """
        pass

    @abstractmethod
    async def structured_output(
        self,
        messages: list[dict],
        response_format: Optional[dict] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """
        Generate a structured (JSON) output from the LLM.
        Uses lower temperature for more deterministic output.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            response_format: Optional JSON schema for the response.
            temperature: Sampling temperature (lower for structured output).
            max_tokens: Maximum tokens in the response.

        Returns:
            JSON string response.
        """
        pass
