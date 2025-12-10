"""
API Routes Package

Consolidates all API routes into a single router.
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .chat import router as chat_router
from .conversations import router as conversations_router
from .prompts import router as prompts_router

api_router = APIRouter()

# Include routes
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
api_router.include_router(conversations_router, prefix="/chat", tags=["Conversations"])
api_router.include_router(prompts_router, prefix="/prompts", tags=["Prompts"])
