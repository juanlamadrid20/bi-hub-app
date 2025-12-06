"""
Conversation Service

Handles CRUD operations for conversations (threads) and messages (steps) in Lakebase.
"""

import logging
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for managing conversations and messages."""

    def __init__(self, db: Session, user_identifier: str):
        self.db = db
        self.user_identifier = user_identifier

    def get_user_id(self) -> Optional[str]:
        """Get or create user ID for the current user."""
        # First, try to find existing user
        result = self.db.execute(
            text("SELECT id FROM users WHERE identifier = :identifier"),
            {"identifier": self.user_identifier}
        ).fetchone()

        if result:
            return str(result[0])

        # Create new user
        user_id = str(uuid4())
        now = datetime.utcnow().isoformat()
        self.db.execute(
            text("""
                INSERT INTO users (id, identifier, metadata, "createdAt")
                VALUES (:id, :identifier, :metadata, :created_at)
            """),
            {
                "id": user_id,
                "identifier": self.user_identifier,
                "metadata": "{}",
                "created_at": now
            }
        )
        self.db.commit()
        logger.info(f"Created new user: {user_id} for identifier: {self.user_identifier}")
        return user_id

    def create_thread(self, name: Optional[str] = None) -> str:
        """Create a new conversation thread."""
        user_id = self.get_user_id()
        thread_id = str(uuid4())
        now = datetime.utcnow().isoformat()

        self.db.execute(
            text("""
                INSERT INTO threads (id, "createdAt", name, "userId", "userIdentifier", tags, metadata)
                VALUES (:id, :created_at, :name, :user_id, :user_identifier, :tags, :metadata)
            """),
            {
                "id": thread_id,
                "created_at": now,
                "name": name or "New conversation",
                "user_id": user_id,
                "user_identifier": self.user_identifier,
                "tags": "{}",
                "metadata": "{}"
            }
        )
        self.db.commit()
        logger.info(f"Created thread: {thread_id}")
        return thread_id

    def get_threads(self, limit: int = 100) -> List[dict]:
        """Get all threads for the current user, ordered by most recent."""
        user_id = self.get_user_id()
        if not user_id:
            return []

        result = self.db.execute(
            text("""
                SELECT 
                    t.id,
                    t.name,
                    t."createdAt",
                    t."userId",
                    COUNT(s.id) as message_count
                FROM threads t
                LEFT JOIN steps s ON s."threadId" = t.id
                WHERE t."userId" = :user_id
                GROUP BY t.id, t.name, t."createdAt", t."userId"
                ORDER BY CAST(t."createdAt" AS TIMESTAMP) DESC
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": limit}
        )

        threads = []
        for row in result:
            threads.append({
                "id": str(row[0]),
                "title": row[1] or "New conversation",
                "createdAt": row[2],
                "updatedAt": row[2],  # Use createdAt as updatedAt for now
                "messageCount": row[4] or 0
            })

        return threads

    def get_thread(self, thread_id: str) -> Optional[dict]:
        """Get a specific thread by ID."""
        result = self.db.execute(
            text("""
                SELECT id, name, "createdAt", "userId"
                FROM threads
                WHERE id = :thread_id
            """),
            {"thread_id": thread_id}
        ).fetchone()

        if not result:
            return None

        return {
            "id": str(result[0]),
            "title": result[1] or "New conversation",
            "createdAt": result[2],
            "updatedAt": result[2]
        }

    def update_thread_name(self, thread_id: str, name: str) -> bool:
        """Update thread name/title."""
        result = self.db.execute(
            text("""
                UPDATE threads
                SET name = :name
                WHERE id = :thread_id
            """),
            {"thread_id": thread_id, "name": name}
        )
        self.db.commit()
        return result.rowcount > 0

    def delete_thread(self, thread_id: str) -> bool:
        """Delete a thread (cascade deletes steps, elements, feedbacks)."""
        result = self.db.execute(
            text("DELETE FROM threads WHERE id = :thread_id"),
            {"thread_id": thread_id}
        )
        self.db.commit()
        return result.rowcount > 0

    def get_steps(self, thread_id: str) -> List[dict]:
        """Get all steps (messages) for a thread."""
        result = self.db.execute(
            text("""
                SELECT 
                    id,
                    name,
                    type,
                    input,
                    output,
                    "createdAt",
                    "isError"
                FROM steps
                WHERE "threadId" = :thread_id
                ORDER BY CAST("createdAt" AS TIMESTAMP) ASC
            """),
            {"thread_id": thread_id}
        )

        messages = []
        for row in result:
            step_type = row[2]
            if step_type == "user_message":
                messages.append({
                    "id": str(row[0]),
                    "role": "user",
                    "content": row[3] or "",
                    "timestamp": row[5]
                })
            elif step_type == "assistant_message":
                messages.append({
                    "id": str(row[0]),
                    "role": "assistant",
                    "content": row[4] or "",
                    "timestamp": row[5]
                })

        return messages

    def create_step(
        self,
        thread_id: str,
        step_type: str,
        name: str,
        input_text: Optional[str] = None,
        output_text: Optional[str] = None,
        is_error: bool = False
    ) -> str:
        """Create a step (message) in a thread."""
        step_id = str(uuid4())
        now = datetime.utcnow().isoformat()

        self.db.execute(
            text("""
                INSERT INTO steps (
                    id, name, type, "threadId", streaming, "waitForAnswer",
                    "isError", metadata, tags, input, output, "createdAt"
                )
                VALUES (
                    :id, :name, :type, :thread_id, :streaming, :wait_for_answer,
                    :is_error, :metadata, :tags, :input, :output, :created_at
                )
            """),
            {
                "id": step_id,
                "name": name,
                "type": step_type,
                "thread_id": thread_id,
                "streaming": False,
                "wait_for_answer": False,
                "is_error": is_error,
                "metadata": "{}",
                "tags": "{}",
                "input": input_text,
                "output": output_text,
                "created_at": now
            }
        )
        self.db.commit()
        logger.debug(f"Created step: {step_id} in thread: {thread_id}")
        return step_id

    def update_step_output(self, step_id: str, output: str) -> bool:
        """Update step output (for streaming completion)."""
        result = self.db.execute(
            text("""
                UPDATE steps
                SET output = :output, streaming = false
                WHERE id = :step_id
            """),
            {"step_id": step_id, "output": output}
        )
        self.db.commit()
        return result.rowcount > 0
