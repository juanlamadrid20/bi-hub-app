"""
Conversation Routes

API endpoints for managing conversations (threads) and messages.
"""

import logging
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import Identity, get_identity
from ..services.database import get_db
from ..services.conversation_service import ConversationService
from ..schemas.chat import Conversation as ConversationSchema, Message as MessageSchema

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationSchema])
async def list_conversations(
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
    limit: int = 100
) -> List[ConversationSchema]:
    """List all conversations for the current user."""
    # Return empty list if database not configured
    if db is None:
        logger.info("Database not configured - returning empty conversation list")
        return []
    
    try:
        # Use email as identifier (legacy app sets email to user.identifier)
        user_identifier = identity.email or identity.display_name or "anonymous"
        service = ConversationService(db, user_identifier)
        threads = service.get_threads(limit=limit)
        
        # Convert to schema format
        conversations = []
        for thread in threads:
            # Get messages for each thread
            messages = service.get_steps(thread["id"])
            conversations.append(ConversationSchema(
                id=thread["id"],
                title=thread["title"],
                messages=[MessageSchema(**msg) for msg in messages],
                createdAt=thread["createdAt"],
                updatedAt=thread["updatedAt"]
            ))
        
        return conversations
    except Exception as e:
        logger.exception(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
async def get_conversation(
    conversation_id: str,
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> ConversationSchema:
    """Get a specific conversation by ID."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Use email as identifier (legacy app sets email to user.identifier)
        user_identifier = identity.email or identity.display_name or "anonymous"
        service = ConversationService(db, user_identifier)
        thread = service.get_thread(conversation_id)
        
        if not thread:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        messages = service.get_steps(conversation_id)
        
        return ConversationSchema(
            id=thread["id"],
            title=thread["title"],
            messages=[MessageSchema(**msg) for msg in messages],
            createdAt=thread["createdAt"],
            updatedAt=thread["updatedAt"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations", response_model=ConversationSchema)
async def create_conversation(
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
    name: Optional[str] = None
) -> ConversationSchema:
    """Create a new conversation."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Use email as identifier (legacy app sets email to user.identifier)
        user_identifier = identity.email or identity.display_name or "anonymous"
        service = ConversationService(db, user_identifier)
        thread_id = service.create_thread(name=name)
        
        thread = service.get_thread(thread_id)
        return ConversationSchema(
            id=thread["id"],
            title=thread["title"],
            messages=[],
            createdAt=thread["createdAt"],
            updatedAt=thread["updatedAt"]
        )
    except Exception as e:
        logger.exception(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/conversations/{conversation_id}", response_model=ConversationSchema)
async def update_conversation(
    conversation_id: str,
    title: str = Query(..., description="New conversation title"),
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> ConversationSchema:
    """Update conversation title."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Use email as identifier (legacy app sets email to user.identifier)
        user_identifier = identity.email or identity.display_name or "anonymous"
        service = ConversationService(db, user_identifier)
        success = service.update_thread_name(conversation_id, title)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        thread = service.get_thread(conversation_id)
        messages = service.get_steps(conversation_id)
        
        return ConversationSchema(
            id=thread["id"],
            title=thread["title"],
            messages=[MessageSchema(**msg) for msg in messages],
            createdAt=thread["createdAt"],
            updatedAt=thread["updatedAt"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    identity: Identity = Depends(get_identity),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a conversation."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Use email as identifier (legacy app sets email to user.identifier)
        user_identifier = identity.email or identity.display_name or "anonymous"
        service = ConversationService(db, user_identifier)
        success = service.delete_thread(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True, "id": conversation_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
