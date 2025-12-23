"""
Analytics Service

Provides analytics data for prompts, conversations, and usage patterns.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics and usage statistics."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_prompt_usage_stats(self, days: int = 30) -> Dict:
        """
        Get prompt usage statistics.

        Args:
            days: Number of days to analyze (default 30)

        Returns:
            Dictionary with prompt usage stats including:
            - total_prompts: Total number of prompts
            - total_usage: Total usage count across all prompts
            - top_prompts: List of most used prompts
            - usage_by_category: Usage breakdown by category
            - recently_used: Recently used prompts
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Total prompts and usage
        totals = self.db.execute(
            text("""
                SELECT
                    COUNT(*) as total_prompts,
                    COALESCE(SUM(usage_count), 0) as total_usage,
                    COUNT(CASE WHEN is_favorite THEN 1 END) as favorites_count
                FROM prompts
            """)
        ).fetchone()

        # Top prompts by usage
        top_prompts_result = self.db.execute(
            text("""
                SELECT id, title, category, usage_count, last_used_at
                FROM prompts
                WHERE usage_count > 0
                ORDER BY usage_count DESC
                LIMIT 10
            """)
        )
        top_prompts = [
            {
                "id": row[0],
                "title": row[1],
                "category": row[2],
                "usage_count": row[3],
                "last_used_at": row[4].isoformat() if row[4] else None
            }
            for row in top_prompts_result
        ]

        # Usage by category
        category_result = self.db.execute(
            text("""
                SELECT
                    category,
                    COUNT(*) as prompt_count,
                    COALESCE(SUM(usage_count), 0) as total_usage
                FROM prompts
                GROUP BY category
                ORDER BY total_usage DESC
            """)
        )
        usage_by_category = [
            {
                "category": row[0],
                "prompt_count": row[1],
                "total_usage": row[2]
            }
            for row in category_result
        ]

        # Recently used prompts
        recently_used_result = self.db.execute(
            text("""
                SELECT id, title, category, usage_count, last_used_at
                FROM prompts
                WHERE last_used_at IS NOT NULL
                ORDER BY last_used_at DESC
                LIMIT 5
            """)
        )
        recently_used = [
            {
                "id": row[0],
                "title": row[1],
                "category": row[2],
                "usage_count": row[3],
                "last_used_at": row[4].isoformat() if row[4] else None
            }
            for row in recently_used_result
        ]

        return {
            "total_prompts": totals[0] if totals else 0,
            "total_usage": totals[1] if totals else 0,
            "favorites_count": totals[2] if totals else 0,
            "top_prompts": top_prompts,
            "usage_by_category": usage_by_category,
            "recently_used": recently_used,
            "period_days": days
        }

    def get_conversation_stats(self, days: int = 30) -> Dict:
        """
        Get conversation statistics.

        Args:
            days: Number of days to analyze (default 30)

        Returns:
            Dictionary with conversation stats including:
            - total_conversations: Total conversation count
            - total_messages: Total message count
            - conversations_by_day: Daily conversation counts
            - avg_messages_per_conversation: Average messages per conversation
            - active_users: Count of unique users
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Total conversations and messages
        totals = self.db.execute(
            text("""
                SELECT
                    (SELECT COUNT(*) FROM threads) as total_conversations,
                    (SELECT COUNT(*) FROM steps) as total_messages,
                    (SELECT COUNT(DISTINCT "userId") FROM threads) as active_users
            """)
        ).fetchone()

        # Recent conversations (within period)
        recent_result = self.db.execute(
            text("""
                SELECT COUNT(*)
                FROM threads
                WHERE "createdAt" >= :cutoff
            """),
            {"cutoff": cutoff_date}
        ).fetchone()

        # Conversations by day (last N days)
        daily_result = self.db.execute(
            text("""
                SELECT
                    DATE(CAST("createdAt" AS TIMESTAMP)) as day,
                    COUNT(*) as count
                FROM threads
                WHERE "createdAt" >= :cutoff
                GROUP BY DATE(CAST("createdAt" AS TIMESTAMP))
                ORDER BY day DESC
                LIMIT :days
            """),
            {"cutoff": cutoff_date, "days": days}
        )
        conversations_by_day = [
            {"date": str(row[0]), "count": row[1]}
            for row in daily_result
        ]

        # Messages by day
        messages_daily_result = self.db.execute(
            text("""
                SELECT
                    DATE(CAST("createdAt" AS TIMESTAMP)) as day,
                    COUNT(*) as count
                FROM steps
                WHERE "createdAt" >= :cutoff
                GROUP BY DATE(CAST("createdAt" AS TIMESTAMP))
                ORDER BY day DESC
                LIMIT :days
            """),
            {"cutoff": cutoff_date, "days": days}
        )
        messages_by_day = [
            {"date": str(row[0]), "count": row[1]}
            for row in messages_daily_result
        ]

        # Average messages per conversation
        avg_result = self.db.execute(
            text("""
                SELECT AVG(msg_count)
                FROM (
                    SELECT "threadId", COUNT(*) as msg_count
                    FROM steps
                    GROUP BY "threadId"
                ) as thread_counts
            """)
        ).fetchone()

        return {
            "total_conversations": totals[0] if totals else 0,
            "total_messages": totals[1] if totals else 0,
            "active_users": totals[2] if totals else 0,
            "recent_conversations": recent_result[0] if recent_result else 0,
            "conversations_by_day": conversations_by_day,
            "messages_by_day": messages_by_day,
            "avg_messages_per_conversation": round(float(avg_result[0]), 1) if avg_result and avg_result[0] else 0,
            "period_days": days
        }

    def get_trending_topics(self, days: int = 7, limit: int = 10) -> List[Dict]:
        """
        Get trending topics based on recent conversation titles and content.

        Args:
            days: Number of days to analyze (default 7)
            limit: Maximum number of topics to return

        Returns:
            List of trending topics with counts
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Get recent conversation titles for topic extraction
        result = self.db.execute(
            text("""
                SELECT name, COUNT(*) as count
                FROM threads
                WHERE "createdAt" >= :cutoff
                    AND name IS NOT NULL
                    AND name != 'New conversation'
                GROUP BY name
                ORDER BY count DESC
                LIMIT :limit
            """),
            {"cutoff": cutoff_date, "limit": limit}
        )

        topics = [
            {"topic": row[0], "count": row[1]}
            for row in result
        ]

        return topics

    def get_response_time_stats(self, days: int = 7) -> Dict:
        """
        Get response time statistics (approximated from message timestamps).

        Note: This is a simplified implementation. For accurate response times,
        you would need to track start/end times explicitly.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with response time approximations
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Count messages by type for recent period
        result = self.db.execute(
            text("""
                SELECT
                    type,
                    COUNT(*) as count
                FROM steps
                WHERE "createdAt" >= :cutoff
                GROUP BY type
            """),
            {"cutoff": cutoff_date}
        )

        message_counts = {row[0]: row[1] for row in result}

        # Get error rate
        error_result = self.db.execute(
            text("""
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN "isError" = true THEN 1 END) as errors
                FROM steps
                WHERE "createdAt" >= :cutoff
                    AND type = 'assistant_message'
            """),
            {"cutoff": cutoff_date}
        ).fetchone()

        total_responses = error_result[0] if error_result else 0
        error_count = error_result[1] if error_result else 0
        error_rate = round((error_count / total_responses * 100), 2) if total_responses > 0 else 0

        return {
            "period_days": days,
            "user_messages": message_counts.get("user_message", 0),
            "assistant_messages": message_counts.get("assistant_message", 0),
            "error_count": error_count,
            "error_rate_percent": error_rate,
            "total_interactions": sum(message_counts.values())
        }

    def get_dashboard_summary(self, days: int = 30) -> Dict:
        """
        Get complete dashboard summary combining all analytics.

        Args:
            days: Number of days for the analysis period

        Returns:
            Combined analytics dashboard data
        """
        return {
            "prompt_stats": self.get_prompt_usage_stats(days),
            "conversation_stats": self.get_conversation_stats(days),
            "trending_topics": self.get_trending_topics(days=7, limit=10),
            "response_stats": self.get_response_time_stats(days=7),
            "generated_at": datetime.utcnow().isoformat()
        }
