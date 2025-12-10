"""
Prompt Routes

API endpoints for managing prompt templates.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..services.database import get_db, is_database_configured
from ..services.prompt_service import PromptService
from ..schemas.prompt import (
    PromptCreateRequest,
    PromptListResponse,
    PromptResponse,
    PromptUpdateRequest,
    PromptUsageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def get_prompt_service(db: Session = Depends(get_db)) -> PromptService:
    """Dependency to get PromptService instance."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Prompt management is unavailable."
        )
    return PromptService(db)


# ==================== Prompt Endpoints ====================


@router.get("", response_model=PromptListResponse)
async def list_prompts(
    prompt_service: PromptService = Depends(get_prompt_service),
    category: Optional[str] = Query(None, description="Filter by category"),
    favorites_only: bool = Query(False, description="Show only favorites"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> PromptListResponse:
    """
    List all prompts with optional filtering.

    Ordered by: favorites first, then usage count, then alphabetically.

    Args:
        category: Filter by category (customer, inventory, analytics, reporting, general)
        favorites_only: If true, only return favorite prompts
        limit: Maximum number of prompts to return (1-500)
        offset: Number of prompts to skip for pagination

    Returns:
        List of prompts and total count
    """
    prompts = prompt_service.list_prompts(
        category=category,
        favorites_only=favorites_only,
        limit=limit,
        offset=offset,
    )

    return PromptListResponse(
        prompts=[PromptResponse(**p) for p in prompts],
        total=len(prompts),
    )


@router.post("", response_model=PromptResponse, status_code=201)
async def create_prompt(
    request: PromptCreateRequest,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    """
    Create a new prompt template.

    Args:
        request: Prompt creation data

    Returns:
        Created prompt
    """
    try:
        prompt = prompt_service.create_prompt(
            title=request.title,
            content=request.content,
            category=request.category,
            description=request.description,
            is_favorite=request.is_favorite,
        )
        return PromptResponse(**prompt)
    except Exception as e:
        logger.exception(f"Failed to create prompt: {e}")
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="A prompt with this title already exists")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: int,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    """
    Get a specific prompt by ID.

    Args:
        prompt_id: The prompt's database ID

    Returns:
        The requested prompt
    """
    prompt = prompt_service.get_prompt(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse(**prompt)


@router.get("/by-title/{title}", response_model=PromptResponse)
async def get_prompt_by_title(
    title: str,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    """
    Get a prompt by title (for slash command support).

    Args:
        title: The prompt title to look up

    Returns:
        The requested prompt
    """
    prompt = prompt_service.get_prompt_by_title(title)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse(**prompt)


@router.patch("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: int,
    request: PromptUpdateRequest,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    """
    Update a prompt.

    Args:
        prompt_id: The prompt's database ID
        request: Fields to update

    Returns:
        Updated prompt
    """
    update_data = request.model_dump(exclude_unset=True)
    prompt = prompt_service.update_prompt(prompt_id, **update_data)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse(**prompt)


@router.delete("/{prompt_id}", status_code=204)
async def delete_prompt(
    prompt_id: int,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> None:
    """
    Delete a prompt.

    Args:
        prompt_id: The prompt's database ID
    """
    deleted = prompt_service.delete_prompt(prompt_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prompt not found")


@router.post("/{prompt_id}/use", response_model=PromptUsageResponse)
async def increment_prompt_usage(
    prompt_id: int,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptUsageResponse:
    """
    Increment usage count for a prompt.

    Called when a prompt is selected via slash command or modal.

    Args:
        prompt_id: The prompt's database ID

    Returns:
        Updated usage information
    """
    prompt = prompt_service.increment_usage(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptUsageResponse(
        id=prompt["id"],
        usage_count=prompt["usage_count"],
        last_used_at=prompt["last_used_at"],
    )


@router.post("/{prompt_id}/toggle-favorite", response_model=PromptResponse)
async def toggle_favorite(
    prompt_id: int,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> PromptResponse:
    """
    Toggle favorite status of a prompt.

    Args:
        prompt_id: The prompt's database ID

    Returns:
        Updated prompt with new favorite status
    """
    prompt = prompt_service.toggle_favorite(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptResponse(**prompt)
