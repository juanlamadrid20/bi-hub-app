"""
Chat Routes

API endpoints for chat with MAS (Mosaic AI Serving) agents.
Supports SSE streaming responses for real-time token delivery.
"""

import json
import logging
from typing import AsyncIterator, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..auth import Identity, get_identity
from ..config import settings
from ..schemas.chat import (
    SendMessageRequest,
    StarterMessage,
    StartersResponse,
)
from ..services import MASChatClient, normalize

logger = logging.getLogger(__name__)

router = APIRouter()

# MAS client singleton
mas_client = MASChatClient()

HIST_MAX_TURNS = settings.history_max_turns
HIST_MAX_CHARS = settings.history_max_chars


def _msg_char_len(msg: dict) -> int:
    """Heuristic length of a message's content."""
    c = msg.get("content", "")
    if isinstance(c, str):
        return len(c)
    try:
        return sum(len(block.get("text", "")) for block in c if isinstance(c, list))
    except Exception:
        return 0


def _build_messages_with_history(
    user_text: str, history: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Build OpenAI-style messages with trimmed history.

    - Keep the earliest system message (if present)
    - Keep up to HIST_MAX_TURNS most recent non-system turns
    - Enforce a coarse HIST_MAX_CHARS budget
    - Append the current user message last
    """
    history = history or []

    # Extract and keep at most one system message
    system_msgs = [m for m in history if m.get("role") == "system"]
    system_prefix = [system_msgs[0]] if system_msgs else []

    # Non-system messages
    non_system = [m for m in history if m.get("role") != "system"]

    # Keep last N turns
    recent = (
        non_system[-HIST_MAX_TURNS:]
        if len(non_system) > HIST_MAX_TURNS
        else non_system[:]
    )

    # Enforce char budget (walk from the end backwards)
    budget = HIST_MAX_CHARS
    trimmed: List[Dict[str, Any]] = []
    for m in reversed(recent):
        length = _msg_char_len(m)
        if length > budget and trimmed:
            break
        budget -= length
        trimmed.append(m)
    trimmed.reverse()

    # Append current user message
    current = {"role": "user", "content": user_text}

    messages = [*system_prefix, *trimmed, current]

    logger.info(
        "history_built",
        extra={
            "system": len(system_prefix),
            "kept_turns": len(trimmed),
            "total_chars": sum(_msg_char_len(m) for m in trimmed),
        },
    )
    return messages


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""

    def default(self, obj):
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        if hasattr(obj, "item"):
            return obj.item()
        return super().default(obj)


# ==================== Endpoints ====================


@router.get("/starters", response_model=StartersResponse)
async def get_starters() -> StartersResponse:
    """
    Get chat starter messages.

    Returns a list of suggested conversation starters.
    """
    starters = [
        StarterMessage(label=s["label"], message=s["message"])
        for s in settings.chat_starter_messages
    ]
    return StartersResponse(starters=starters, total=len(starters))


@router.post("/message/stream")
async def send_message_stream(
    request: SendMessageRequest,
    identity: Identity = Depends(get_identity),
) -> StreamingResponse:
    """
    Send a message and stream the response via Server-Sent Events (SSE).

    Events:
    - `text`: Text content chunk {"type": "text", "content": "..."}
    - `tool_start`: Tool call starting {"type": "tool_start", "tool": {...}}
    - `tool_result`: Tool result {"type": "tool_result", ...}
    - `done`: Completion {"type": "done"}
    - `error`: Error occurred {"type": "error", "error": "..."}
    """

    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events from MAS streaming response."""
        # Track tool calls to match with outputs
        tool_calls: dict[str, str] = {}  # Maps call_id -> tool_name
        
        try:
            # Build messages with history
            messages = _build_messages_with_history(
                request.message, request.history or []
            )
            logger.info(f"Sending {len(messages)} messages to MAS")

            # Stream from MAS
            raw_events = mas_client.stream_raw(identity, messages)

            async for event in normalize(raw_events):
                event_type = event.get("type")

                if event_type == "response.created":
                    # Acknowledge but don't send to client
                    logger.debug("Response created")
                    continue

                elif event_type == "text.delta":
                    # Send text chunk
                    sse_event = {
                        "type": "text",
                        "content": event.get("delta", ""),
                    }
                    data = json.dumps(sse_event, cls=DateTimeEncoder)
                    yield f"data: {data}\n\n"

                elif event_type == "text.done":
                    # Final text (we've been streaming deltas, so just log)
                    logger.debug(f"Text complete: {len(event.get('text', ''))} chars")

                elif event_type == "tool.call":
                    # Tool call starting
                    call_id = event.get("item_id", "")
                    tool_name = event.get("name", "")
                    # Store tool name for later lookup
                    tool_calls[call_id] = tool_name
                    logger.debug(f"Tool call registered: call_id={call_id}, tool_name={tool_name}")
                    
                    sse_event = {
                        "type": "tool_start",
                        "tool": {
                            "id": call_id,
                            "name": tool_name,
                        },
                        "arguments": event.get("args", ""),
                    }
                    data = json.dumps(sse_event, cls=DateTimeEncoder)
                    yield f"data: {data}\n\n"

                elif event_type == "tool.output":
                    # Tool result
                    # event.get("name") contains the call_id which matches the tool call's item_id
                    call_id = event.get("name", "")
                    output = event.get("output", "")
                    tool_name = tool_calls.get(call_id)
                    
                    logger.debug(
                        f"Tool output received: call_id={call_id}, "
                        f"found_tool_name={tool_name}, "
                        f"available_keys={list(tool_calls.keys())}"
                    )
                    
                    if not tool_name:
                        # Fallback: try to extract tool name from output if it contains "Handed off to:"
                        if isinstance(output, str) and "Handed off to:" in output:
                            # Extract tool name from "Handed off to: tool-name"
                            parts = output.split("Handed off to:")
                            if len(parts) > 1:
                                tool_name = parts[1].strip()
                                logger.info(f"Extracted tool name from output: {tool_name} (call_id: {call_id})")
                        
                        if not tool_name:
                            logger.warning(
                                f"Tool name not found for call_id: {call_id}. "
                                f"Available tool_calls: {list(tool_calls.keys())}. "
                                f"Output preview: {str(output)[:100]}"
                            )
                            tool_name = "unknown_tool"
                    
                    sse_event = {
                        "type": "tool_result",
                        "tool_call_id": call_id,  # Use call_id to match tool call
                        "tool_name": tool_name,  # Look up the actual tool name
                        "result": output,
                        "is_error": False,
                    }
                    data = json.dumps(sse_event, cls=DateTimeEncoder)
                    yield f"data: {data}\n\n"

            # Send done event
            done_event = {"type": "done"}
            data = json.dumps(done_event)
            yield f"data: {data}\n\n"

        except Exception as e:
            logger.exception(f"Error in chat stream: {e}")
            error_event = {"type": "error", "error": str(e)}
            data = json.dumps(error_event)
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/message")
async def send_message(
    request: SendMessageRequest,
    identity: Identity = Depends(get_identity),
) -> dict:
    """
    Send a message and get a non-streaming response.

    For streaming responses, use the /stream endpoint instead.
    """
    try:
        messages = _build_messages_with_history(request.message, request.history or [])
        logger.info(f"Sending {len(messages)} messages to MAS (non-streaming)")

        response = await mas_client.create_once(identity, messages)

        return {
            "content": response.get("output", {}).get("content", ""),
            "tool_calls": response.get("tool_calls", []),
        }
    except Exception as e:
        logger.exception(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
