"""
MAS Event Normalizer

Normalizes OpenAI/MAS SDK events into a standard format for the frontend.
"""

from typing import Dict, Any, AsyncIterator, List


async def normalize(raw_events) -> AsyncIterator[Dict[str, Any]]:
    """
    Normalize OpenAI/MAS SDK events into standard shapes.

    Output event types:
      - {"type": "response.created"}
      - {"type": "text.delta", "item_id": str, "delta": str}
      - {"type": "text.done", "item_id": str, "text": str}
      - {"type": "tool.call", "item_id": str, "name": str, "args": str}
      - {"type": "tool.output", "item_id": str, "name": str, "output": str}

    Args:
        raw_events: Async iterator of raw events from MAS

    Yields:
        Normalized event dictionaries
    """
    async for ev in raw_events:
        # Get event type from either attribute or dict
        et = getattr(ev, "type", None) or (isinstance(ev, dict) and ev.get("type"))

        if et == "response.created":
            yield {"type": "response.created"}

        elif et == "response.output_text.delta":
            yield {
                "type": "text.delta",
                "item_id": _get_value(ev, "item_id"),
                "delta": _get_value(ev, "delta") or "",
            }

        elif et == "response.output_item.done":
            item = _get_value(ev, "item")
            if not item:
                continue

            itype = _get_value(item, "type")

            if itype == "message":
                content = _get_value(item, "content") or []
                parts: List[str] = []
                for c in content or []:
                    t = _get_value(c, "text")
                    if t:
                        parts.append(t)
                yield {
                    "type": "text.done",
                    "item_id": _get_value(ev, "item_id"),
                    "text": "\n".join(parts).strip(),
                }

            elif itype == "function_call":
                yield {
                    "type": "tool.call",
                    "item_id": _get_value(ev, "item_id"),
                    "name": _get_value(item, "name"),
                    "args": _get_value(item, "arguments") or "",
                }

            elif itype == "function_call_output":
                yield {
                    "type": "tool.output",
                    "item_id": _get_value(ev, "item_id"),
                    "name": _get_value(item, "call_id"),
                    "output": _get_value(item, "output") or "",
                }

        elif et == "response.error":
            err = _get_value(ev, "error") or str(ev)
            yield {"type": "text.done", "item_id": None, "text": f"❌ {err}"}


def _get_value(obj: Any, key: str) -> Any:
    """
    Get value from either an object attribute or dict key.

    Args:
        obj: Object or dict to get value from
        key: Attribute/key name

    Returns:
        The value or None
    """
    if obj is None:
        return None
    return getattr(obj, key, None) or (isinstance(obj, dict) and obj.get(key))









