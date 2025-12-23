"""
Analytics Routes

API endpoints for analytics dashboard data.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_identity
from ..auth.identity import Identity
from ..services.database import get_db
from ..services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    days: int = Query(30, ge=1, le=365, description="Number of days for analysis"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get complete analytics dashboard data.

    Returns combined analytics including:
    - Prompt usage statistics
    - Conversation statistics
    - Trending topics
    - Response statistics
    """
    if db is None:
        return {
            "error": "Database not configured",
            "prompt_stats": None,
            "conversation_stats": None,
            "trending_topics": [],
            "response_stats": None
        }

    service = AnalyticsService(db)
    return service.get_dashboard_summary(days)


@router.get("/prompts")
async def get_prompt_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days for analysis"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get prompt usage analytics.

    Returns:
    - Total prompts and usage counts
    - Top prompts by usage
    - Usage breakdown by category
    - Recently used prompts
    """
    if db is None:
        return {"error": "Database not configured"}

    service = AnalyticsService(db)
    return service.get_prompt_usage_stats(days)


@router.get("/conversations")
async def get_conversation_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days for analysis"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get conversation analytics.

    Returns:
    - Total conversations and messages
    - Daily conversation counts
    - Average messages per conversation
    - Active users count
    """
    if db is None:
        return {"error": "Database not configured"}

    service = AnalyticsService(db)
    return service.get_conversation_stats(days)


@router.get("/trending")
async def get_trending_topics(
    days: int = Query(7, ge=1, le=30, description="Number of days for analysis"),
    limit: int = Query(10, ge=1, le=50, description="Maximum topics to return"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get trending topics from recent conversations.

    Returns list of topics with their occurrence counts.
    """
    if db is None:
        return {"topics": [], "error": "Database not configured"}

    service = AnalyticsService(db)
    topics = service.get_trending_topics(days, limit)
    return {"topics": topics, "period_days": days}


@router.get("/response-stats")
async def get_response_stats(
    days: int = Query(7, ge=1, le=30, description="Number of days for analysis"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get response statistics.

    Returns:
    - Message counts by type
    - Error rate
    - Total interactions
    """
    if db is None:
        return {"error": "Database not configured"}

    service = AnalyticsService(db)
    return service.get_response_time_stats(days)
