"""
MAS Chat Client

Transport-only client for Databricks Model Serving (MAS) endpoints.

Supports two authentication modes:
- PAT (auth_type == "pat"): Personal Access Token for local development
- OBO (auth_type == "obo"): On-Behalf-Of for Databricks Apps deployment
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator, Any, Dict, List

import httpx
from openai import AsyncOpenAI

from ..auth.identity import Identity
from ..config import settings

logger = logging.getLogger(__name__)


class MASChatClient:
    """
    Transport-only client for Databricks MAS.

    Public methods:
      - stream_raw(identity, messages) -> async iterator of raw events
      - create_once(identity, messages) -> one-shot non-streaming response
    """

    def __init__(self) -> None:
        self._base_url: str = settings.agent_base_url.rstrip("/")
        self._endpoint: str = settings.agent_endpoint or ""
        self._timeout_s: int = settings.http_timeout_s

    # ---------- Public API ----------

    async def stream_raw(
        self, identity: Identity, messages: List[Dict[str, Any]]
    ) -> AsyncIterator[Any]:
        """
        Yield raw streaming events.

        Args:
            identity: User identity with token source
            messages: OpenAI-style messages [{"role":"user","content":"..."}]

        Yields:
            Raw event objects/dicts from the MAS endpoint
        """
        bearer = identity.token_source.bearer_token()
        if not bearer:
            raise RuntimeError("Missing bearer token")

        # Use REST SSE for both PAT and OBO (more reliable for streaming)
        async for ev in self._stream_rest_sse(bearer, messages):
            yield ev

    async def create_once(
        self, identity: Identity, messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Non-streaming call. Returns parsed JSON response.

        Args:
            identity: User identity with token source
            messages: OpenAI-style messages

        Returns:
            Parsed response dict
        """
        bearer = identity.token_source.bearer_token()
        if not bearer:
            raise RuntimeError("Missing bearer token")

        if identity.auth_type == "pat":
            client = self._client_openai(bearer)
            resp = await client.responses.create(
                model=self._endpoint,
                input=messages,
                stream=False,
            )
            return json.loads(
                json.dumps(resp, default=lambda o: getattr(o, "__dict__", str(o)))
            )
        else:
            url = f"{self._base_url}/{self._endpoint}/invocations"
            async with httpx.AsyncClient(timeout=self._timeout_s) as http:
                r = await http.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {bearer}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={"input": messages, "stream": False},
                )
                if r.status_code >= 400:
                    raise RuntimeError(f"MAS HTTP {r.status_code}: {r.text}")
                return r.json()

    # ---------- Private Methods ----------

    def _client_openai(self, bearer: str) -> AsyncOpenAI:
        """Create OpenAI client with PAT authentication."""
        return AsyncOpenAI(
            api_key=bearer, base_url=self._base_url, timeout=self._timeout_s
        )

    async def _stream_openai(
        self, bearer: str, messages: List[Dict[str, Any]]
    ) -> AsyncIterator[Any]:
        """
        Streaming via OpenAI-compatible SDK (works well with PAT).
        """
        logger.debug(f"_stream_openai called, token length: {len(bearer)}")
        client = self._client_openai(bearer)
        async with client.responses.stream(
            model=self._endpoint,
            input=messages,
        ) as stream:
            async for event in stream:
                logger.debug(f"OpenAI stream event: {event}")
                yield event

    async def _stream_rest_sse(
        self, bearer: str, messages: List[Dict[str, Any]]
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Streaming via raw SSE from /invocations endpoint.

        This method is used for both PAT and OBO authentication modes
        as it provides more reliable streaming behavior.
        """
        logger.debug(f"_stream_rest_sse called, token length: {len(bearer)}")
        url = f"{self._base_url}/{self._endpoint}/invocations"
        headers = {
            "Authorization": f"Bearer {bearer}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        payload = {"input": messages, "stream": True}

        async with httpx.AsyncClient(timeout=self._timeout_s) as http:
            async with http.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    raise RuntimeError(
                        f"MAS HTTP {resp.status_code}: {body.decode('utf-8', errors='ignore')}"
                    )

                async for line in resp.aiter_lines():
                    if not line:
                        continue

                    # SSE lines can be comments (':keepalive') or 'data: {...}'
                    if line.startswith(":"):
                        continue

                    if line.lower().startswith("data:"):
                        data = line[5:].strip()
                    else:
                        data = line.strip()

                    if not data or data == "[DONE]":
                        continue

                    try:
                        obj = json.loads(data)
                    except json.JSONDecodeError:
                        logger.warning(f"SSE parse warning: {data[:200]}")
                        continue

                    yield obj
