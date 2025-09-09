import chainlit as cl
from config import settings
from auth.identity import Identity, OboTokenSource, PatTokenSource
from typing import Dict
from utils.logging import logger

# Import the global headers from header.py
from auth.header import _global_headers

def _headers_getter() -> Dict[str, str]:
    logger.info("[DEBUG] _headers_getter() called from ensure_identity")
    
    # Try to get headers from global storage first
    user = cl.user_session.get("user")
    logger.info(f"[DEBUG] User: {user}")
    if user and user.identifier in _global_headers:
        headers = _global_headers[user.identifier]
        logger.info(f"[DEBUG] Found headers in global storage: {list(headers.keys())}")
        return headers
    
    logger.info(f"[DEBUG] Global headers available: {list(_global_headers.keys())}")
    
    # Fallback to request object (might be None on Databricks)
    request = cl.user_session.get("request")
    logger.info(f"[DEBUG] Request object: {request}")
    if request is None:
        logger.warning("[DEBUG] Request object is None, returning empty headers")
        return {}
    return request.headers or {}


async def ensure_identity():
    identity = cl.user_session.get("identity")
    if identity:
        return identity

    user = cl.user_session.get("user")
    if not user:
        logger.warning("User not found for this session. Please login again.")
        return None

    display_name = user.display_name

    if settings.enable_password_auth:
        auth_type = "pat"
        token_source = PatTokenSource(settings.pat)
    else:
        auth_type = "obo"
        token_source = OboTokenSource(_headers_getter)

    cl.user_session.set("identity", Identity(
        display_name=display_name,
        auth_type=auth_type,
        token_source=token_source
    ))

    logger.info(f"Identity: {cl.user_session.get('identity')}")
