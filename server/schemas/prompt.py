"""
Pydantic schemas for Prompt API.

Defines request and response models for prompt management endpoints.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# Valid categories for prompts
PromptCategory = Literal["customer", "inventory", "analytics", "reporting", "general"]


# ==================== Request Models ====================


class PromptCreateRequest(BaseModel):
    """Request to create a new prompt."""

    title: str = Field(..., min_length=1, max_length=255, description="Unique title for the prompt")
    content: str = Field(..., min_length=1, description="The prompt text content")
    category: PromptCategory = Field(..., description="Category for organizing prompts")
    description: Optional[str] = Field(None, description="Optional description of the prompt")
    is_favorite: bool = Field(default=False, description="Whether to mark as favorite")


class PromptUpdateRequest(BaseModel):
    """Request to update a prompt. All fields are optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[PromptCategory] = None
    description: Optional[str] = None
    is_favorite: Optional[bool] = None


# ==================== Response Models ====================


class PromptResponse(BaseModel):
    """A prompt template."""

    id: int
    title: str
    content: str
    category: str
    description: Optional[str]
    is_favorite: bool
    usage_count: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PromptListResponse(BaseModel):
    """List of prompts."""

    prompts: list[PromptResponse]
    total: int


class PromptUsageResponse(BaseModel):
    """Response after incrementing usage."""

    id: int
    usage_count: int
    last_used_at: datetime
