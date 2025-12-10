"""
SQLAlchemy model for prompt management.

Stores reusable prompt templates for the chat interface.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    CheckConstraint,
)
from .base import Base


class Prompt(Base):
    """
    Prompt template model.

    System-wide prompts for chat interface with metadata tracking.
    Supports slash commands, favorites, and usage analytics.

    Categories:
        - customer: Customer analytics and segmentation
        - inventory: Inventory operations and tracking
        - analytics: Cross-domain analytics
        - reporting: Reports and dashboards
        - general: General queries
    """

    __tablename__ = "prompts"
    __table_args__ = (
        CheckConstraint(
            "category IN ('customer', 'inventory', 'analytics', 'reporting', 'general')",
            name="prompts_category_check",
        ),
    )

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False, index=True)
    usage_count = Column(Integer, default=0, nullable=False, index=True)
    last_used_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        """String representation of Prompt."""
        return f"<Prompt(id={self.id}, title='{self.title}', category='{self.category}')>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "description": self.description,
            "is_favorite": self.is_favorite,
            "usage_count": self.usage_count,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
