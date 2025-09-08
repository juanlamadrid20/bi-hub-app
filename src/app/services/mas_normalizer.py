# services/mas_normalizer.py
from typing import Dict, Any, AsyncIterator, List

async def normalize(raw_events) -> AsyncIterator[Dict[str, Any]]:
    """
    Normalize OpenAI/MAS SDK events into 4 shapes:
      - {"type":"text.delta","item_id":str,"delta":str}
      - {"type":"text.done","item_id":str,"text":str}
      - {"type":"tool.call","item_id":str,"name":str,"args":str}
      - {"type":"tool.output","item_id":str,"name":str,"output":str}
    """
    async for ev in raw_events:
        et = getattr(ev, "type", None) or (isinstance(ev, dict) and ev.get("type"))

        if et == "response.output_text.delta":
            yield {
                "type": "text.delta",
                "item_id": getattr(ev, "item_id", None) or (isinstance(ev, dict) and ev.get("item_id")),
                "delta": getattr(ev, "delta", None) or (isinstance(ev, dict) and ev.get("delta")) or ""
            }

        elif et == "response.output_item.done":
            item = getattr(ev, "item", None) or (isinstance(ev, dict) and ev.get("item"))
            if not item:
                continue
            itype = getattr(item, "type", None) or (isinstance(item, dict) and item.get("type"))

            if itype == "message":
                content = getattr(item, "content", None) or (isinstance(item, dict) and item.get("content")) or []
                parts: List[str] = []
                for c in content or []:
                    t = getattr(c, "text", None) or (isinstance(c, dict) and c.get("text"))
                    if t: parts.append(t)
                yield {
                    "type": "text.done",
                    "item_id": getattr(ev, "item_id", None) or (isinstance(ev, dict) and ev.get("item_id")),
                    "text": "\n".join(parts).strip()
                }

            elif itype == "function_call":
                yield {
                    "type": "tool.call",
                    "item_id": getattr(ev, "item_id", None) or (isinstance(ev, dict) and ev.get("item_id")),
                    "name": getattr(item, "name", None) or (isinstance(item, dict) and item.get("name")),
                    "args": getattr(item, "arguments", None) or (isinstance(item, dict) and item.get("arguments")) or ""
                }

            elif itype == "function_call_output":
                yield {
                    "type": "tool.output",
                    "item_id": getattr(ev, "item_id", None) or (isinstance(ev, dict) and ev.get("item_id")),
                    "name": getattr(item, "call_id", None) or (isinstance(item, dict) and item.get("call_id")),
                    "output": getattr(item, "output", None) or (isinstance(item, dict) and item.get("output")) or ""
                }

        elif et == "response.error":
            # Surface a final error message; upstream can display it.
            err = getattr(ev, "error", None) or (isinstance(ev, dict) and ev.get("error")) or str(ev)
            yield {"type": "text.done", "item_id": None, "text": f"❌ {err}"}
