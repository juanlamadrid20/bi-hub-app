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
    
    # Try to get headers from environ (newer Chainlit versions)
    environ = cl.user_session.get("environ")
    if environ:
        logger.info(f"[DEBUG] Found environ object: {type(environ)}")
        # Extract HTTP headers from environ
        headers = {}
        for key, value in environ.items():
            if key.startswith('HTTP_'):
                # Convert HTTP_X_FORWARDED_ACCESS_TOKEN to x-forwarded-access-token
                header_name = key[5:].lower().replace('_', '-')
                headers[header_name] = value
        if headers:
            logger.info(f"[DEBUG] Extracted headers from environ: {list(headers.keys())}")
            return headers
    
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
    logger.info(f"[DEBUG] User object: {user}")
    logger.info(f"[DEBUG] User metadata: {user.metadata if hasattr(user, 'metadata') else 'No metadata'}")
    
    # Try to access all session keys to see what's available
    session_keys = list(cl.user_session.keys()) if hasattr(cl.user_session, 'keys') else []
    logger.info(f"[DEBUG] Available session keys: {session_keys}")
    
    # Try to access environ directly
    environ = cl.user_session.get("environ")
    if environ:
        logger.info(f"[DEBUG] Environ keys: {list(environ.keys())}")
        # Look for any HTTP headers in environ
        for key, value in environ.items():
            if 'token' in key.lower() or 'auth' in key.lower() or key.startswith('HTTP_'):
                logger.info(f"[DEBUG] Potential auth header: {key} = {value[:20]}...")

    if settings.enable_password_auth:
        auth_type = "pat"
        token_source = PatTokenSource(settings.pat)
    else:
        auth_type = "obo"
        token_source = OboTokenSource(_headers_getter)

    cl.user_session.set("identity", Identity(
        email=user.identifier,  # Set email to the user identifier
        display_name=display_name,
        auth_type=auth_type,
        token_source=token_source
    ))

    logger.info(f"Identity: {cl.user_session.get('identity')}")
