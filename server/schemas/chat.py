"""
Pydantic Schemas for Chat API

Request and response models for chat endpoints.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ==================== Request Models ====================


class SendMessageRequest(BaseModel):
    """Request to send a chat message."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="User message text",
    )
    history: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional conversation history in OpenAI format",
    )


# ==================== Response Models ====================


class StarterMessage(BaseModel):
    """A chat starter message suggestion."""

    label: str = Field(description="Short label for the starter")
    message: str = Field(description="Full message text")
    icon: Optional[str] = Field(default=None, description="Optional icon")


class StartersResponse(BaseModel):
    """List of chat starter messages."""

    starters: List[StarterMessage] = Field(description="Available starter messages")
    total: int = Field(description="Total number of starters")


class ChatResponse(BaseModel):
    """Non-streaming chat response."""

    content: str = Field(description="Assistant response text")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Tool calls made by assistant"
    )


# ==================== SSE Event Models ====================


class SSETextEvent(BaseModel):
    """SSE event for text content chunk."""

    type: Literal["text"] = "text"
    content: str = Field(description="Text content chunk")


class SSEToolStartEvent(BaseModel):
    """SSE event for tool call starting."""

    type: Literal["tool_start"] = "tool_start"
    tool: Dict[str, str] = Field(description="Tool info (id, name)")
    arguments: Optional[str] = Field(default=None, description="Tool arguments JSON")


class SSEToolResultEvent(BaseModel):
    """SSE event for tool execution result."""

    type: Literal["tool_result"] = "tool_result"
    tool_call_id: str = Field(description="Tool call ID")
    tool_name: str = Field(description="Tool name")
    result: Any = Field(description="Tool execution result")
    is_error: bool = Field(default=False, description="Whether execution failed")


class SSEDoneEvent(BaseModel):
    """SSE event for stream completion."""

    type: Literal["done"] = "done"


class SSEErrorEvent(BaseModel):
    """SSE event for errors."""

    type: Literal["error"] = "error"
    error: str = Field(description="Error message")


# Union type for all SSE events (for documentation)
SSEEvent = SSETextEvent | SSEToolStartEvent | SSEToolResultEvent | SSEDoneEvent | SSEErrorEvent


# ==================== Conversation Models ====================


class Message(BaseModel):
    """A chat message."""

    id: str = Field(description="Message ID")
    role: Literal["user", "assistant", "system"] = Field(description="Message role")
    content: str = Field(description="Message content")
    timestamp: str = Field(description="ISO timestamp")


class Conversation(BaseModel):
    """A conversation/thread."""

    id: str = Field(description="Conversation ID")
    title: str = Field(description="Conversation title")
    messages: List[Message] = Field(default_factory=list, description="Messages in conversation")
    createdAt: str = Field(description="ISO creation timestamp")
    updatedAt: str = Field(description="ISO update timestamp")
