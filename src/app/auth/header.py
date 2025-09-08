import chainlit as cl
from config import settings
from typing import Dict, Optional
from utils.logging import logger
from auth.identity import OboTokenSource, Identity

# Global storage for headers - workaround for Chainlit context issue
_global_headers = {}

def _headers_getter() -> Dict[str, str]:
    # Try to get headers from global storage first
    user = cl.user_session.get("user")
    if user and user.identifier in _global_headers:
        return _global_headers[user.identifier]
    
    # Fallback to request object (might be None on Databricks)
    request = cl.user_session.get("request")
    if request is None:
        return {}
    return request.headers or {}


if settings.enable_header_auth:
    @cl.header_auth_callback
    def auth_from_header(headers: Dict[str, str]) -> Optional[cl.User]:
        token = headers.get("x-forwarded-access-token")
        email = headers.get(
            "x-forwarded-email") or headers.get("x-forwarded-user")
        if token and email:
            logger.info(f"[AUTH] Header auth success: {email}")

            # Store headers in global storage for later use
            _global_headers[email] = headers

            user = cl.User(
                identifier=email,
                metadata={"auth_type": "obo"},
                display_name=email,
                email=email,
                provider="obo"
            )
            return user

        logger.warning(
            "[AUTH] Header auth failed — rejecting request (no fallback in Databricks App)")
        return None  # No fallback inside Databricks app
else:
    logger.info("Not running on Databricks — skipping header auth")
