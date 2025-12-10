"""
Service for managing prompt templates.

Provides CRUD operations and usage tracking for prompts.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from ..models.prompt import Prompt

logger = logging.getLogger(__name__)


class PromptService:
    """Service for CRUD operations on prompt templates."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def create_prompt(
        self,
        title: str,
        content: str,
        category: str,
        description: Optional[str] = None,
        is_favorite: bool = False,
    ) -> Dict:
        """
        Create new prompt template.

        Args:
            title: Unique title for the prompt (used for slash commands)
            content: The prompt text content
            category: Category (customer, inventory, analytics, reporting, general)
            description: Optional description of the prompt
            is_favorite: Whether to mark as favorite

        Returns:
            Dictionary representation of created prompt
        """
        prompt = Prompt(
            title=title,
            content=content,
            category=category,
            description=description,
            is_favorite=is_favorite,
        )
        self.db.add(prompt)
        self.db.commit()
        self.db.refresh(prompt)
        logger.info(f"Created prompt: {prompt.title}")
        return prompt.to_dict()

    def get_prompt(self, prompt_id: int) -> Optional[Dict]:
        """
        Get prompt by ID.

        Args:
            prompt_id: The prompt's database ID

        Returns:
            Dictionary representation of prompt or None if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.id == prompt_id).first()
        return prompt.to_dict() if prompt else None

    def get_prompt_by_title(self, title: str) -> Optional[Dict]:
        """
        Get prompt by title (for slash command lookup).

        Args:
            title: The prompt title to search for

        Returns:
            Dictionary representation of prompt or None if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.title == title).first()
        return prompt.to_dict() if prompt else None

    def list_prompts(
        self,
        category: Optional[str] = None,
        favorites_only: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict]:
        """
        List prompts with optional filtering.

        Args:
            category: Filter by category
            favorites_only: Only return favorite prompts
            limit: Maximum number of prompts to return
            offset: Number of prompts to skip

        Returns:
            List of prompt dictionaries, ordered by favorites first,
            then usage count, then alphabetically
        """
        query = self.db.query(Prompt)

        if category:
            query = query.filter(Prompt.category == category)
        if favorites_only:
            query = query.filter(Prompt.is_favorite == True)

        # Order by favorites first, then usage, then alphabetically
        query = query.order_by(
            Prompt.is_favorite.desc(),
            Prompt.usage_count.desc(),
            Prompt.title
        )

        prompts = query.offset(offset).limit(limit).all()
        return [p.to_dict() for p in prompts]

    def update_prompt(self, prompt_id: int, **kwargs) -> Optional[Dict]:
        """
        Update prompt fields.

        Args:
            prompt_id: The prompt's database ID
            **kwargs: Fields to update (title, content, category, description, is_favorite)

        Returns:
            Dictionary representation of updated prompt or None if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            return None

        allowed_fields = ["title", "content", "category", "description", "is_favorite"]

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                setattr(prompt, key, value)

        prompt.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(prompt)
        logger.info(f"Updated prompt: {prompt.title}")
        return prompt.to_dict()

    def delete_prompt(self, prompt_id: int) -> bool:
        """
        Delete prompt by ID.

        Args:
            prompt_id: The prompt's database ID

        Returns:
            True if deleted, False if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            return False

        title = prompt.title
        self.db.delete(prompt)
        self.db.commit()
        logger.info(f"Deleted prompt: {title}")
        return True

    def increment_usage(self, prompt_id: int) -> Optional[Dict]:
        """
        Increment usage count and update last_used_at.

        Args:
            prompt_id: The prompt's database ID

        Returns:
            Dictionary representation of updated prompt or None if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            return None

        prompt.usage_count += 1
        prompt.last_used_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(prompt)
        logger.debug(f"Incremented usage for prompt: {prompt.title} (count: {prompt.usage_count})")
        return prompt.to_dict()

    def toggle_favorite(self, prompt_id: int) -> Optional[Dict]:
        """
        Toggle favorite status.

        Args:
            prompt_id: The prompt's database ID

        Returns:
            Dictionary representation of updated prompt or None if not found
        """
        prompt = self.db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            return None

        prompt.is_favorite = not prompt.is_favorite
        self.db.commit()
        self.db.refresh(prompt)
        logger.info(f"Toggled favorite for prompt: {prompt.title} (is_favorite: {prompt.is_favorite})")
        return prompt.to_dict()
