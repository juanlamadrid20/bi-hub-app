import chainlit as cl
from config import settings
from typing import Dict, Optional
from utils.logging import logger
from auth.identity import OboTokenSource, Identity


def _headers_getter() -> Dict[str, str]:
    request = cl.user_session.get("request")
    return request.headers or {}


if settings.enable_header_auth:
    @cl.header_auth_callback
    def auth_from_header(headers: Dict[str, str]) -> Optional[cl.User]:
        token = headers.get("x-forwarded-access-token")
        email = headers.get(
            "x-forwarded-email") or headers.get("x-forwarded-user")
        if token and email:
            logger.info(f"[AUTH] Header auth success: {email}")

            user = cl.User(
                identifier=email,
                metadata={"auth_type": "obo"},
                email=email,
                provider="obo"
            )
            return user

        logger.warning(
            "[AUTH] Header auth failed — rejecting request (no fallback in Databricks App)")
        return None  # No fallback inside Databricks app
else:
    logger.info("Not running on Databricks — skipping header auth")
