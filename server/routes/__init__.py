"""
API Routes Package

Consolidates all API routes into a single router.
"""

from fastapi import APIRouter

from .chat import router as chat_router

api_router = APIRouter()

# Include chat routes
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
