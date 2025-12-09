"""
Identity Models

Token sources and identity models for authentication.
"""

from pydantic import BaseModel, Field
from typing import Any, Protocol, Optional, Callable, Dict, Literal


class TokenSource(Protocol):
    """Protocol for token sources."""

    def bearer_token(self) -> str:
        """Return the bearer token."""
        ...


class OboTokenSource:
    """Token source for On-Behalf-Of (OBO) authentication."""

    def __init__(self, headers_getter: Callable[[], Dict[str, str]]):
        self._headers_getter = headers_getter

    def bearer_token(self) -> str:
        """Get bearer token from forwarded headers."""
        h = self._headers_getter() or {}
        return h.get("x-forwarded-access-token", "")


class PatTokenSource:
    """Token source for Personal Access Token (PAT) authentication."""

    def __init__(self, pat: Optional[str]):
        self._pat = pat

    def bearer_token(self) -> str:
        """Return the PAT token."""
        return self._pat or ""


class Identity(BaseModel):
    """User identity with token source."""

    email: Optional[str] = None
    display_name: Optional[str] = None
    auth_type: Literal["obo", "pat"] = "pat"
    token_source: Any = Field(repr=False)

    class Config:
        """Pydantic config."""

        arbitrary_types_allowed = True




