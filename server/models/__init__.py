"""
SQLAlchemy Models for BI Hub

This module contains all database models for the application.
"""

from .base import Base
from .prompt import Prompt

__all__ = ["Base", "Prompt"]
