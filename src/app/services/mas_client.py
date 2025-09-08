from openai import AsyncOpenAI
from config import settings
from auth.identity import Identity
from utils.logging import logger
from typing import AsyncIterable, Dict, Any, List

class MASChatClient:
    def __init__(self):
        self._base_url = settings.agent_base_url
        self._agent_endpoint = settings.agent_endpoint

    def _client(self, bearer_token: str) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key=bearer_token,
            base_url=settings.agent_base_url,
        )

    
    async def stram_raw(self, identity: Identity, messages: List[Dict[str, str]]) -> AsyncIterable[str]:
        token = identity.token_source.bearer_token()
        if not token:
            raise ValueError("Token is required")
        client = self._client(token)
        stream = await client.responses.create(
            model=self._agent_endpoint,
            input=messages,
            stream=True,
        )

        async with stream:
            async for event in stream:
                yield event


    # async def query(self, identity: Identity, query: str):
    #     token = identity.token_source.bearer_token()
    #     client = self._client(token)

    #     stream = await client.responses.create(
    #         model=self._agent_endpoint,
    #         input=[{"role": "user", "content": query}],
    #         stream=True,
    #     )

    #     output_text = []
    #     async for event in stream:
    #         if event.type == "response.output_text.delta":
    #             token = event.delta
    #             output_text.append(token)
    #         elif event.type == "response.error":
    #             logger.error(f"Response error: {event}")
    #             return {
    #                 "success": False,
    #                 "content": f"Error: {event}"
    #             }

    #     # Join all tokens to get the full response
    #     full_text = "".join(output_text)

    #     if full_text:
    #         return {
    #             "success": True,
    #             "content": full_text
    #         }

    #     # Fallback if content extraction fails
    #     return {
    #         "success": True,
    #         "content": f"Failed to extract response content"
    #     }
