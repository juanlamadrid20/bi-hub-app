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
    logger.info("[AUTH] Header auth is ENABLED - registering callback")
    
    @cl.header_auth_callback
    def auth_from_header(headers: Dict[str, str]) -> Optional[cl.User]:
        logger.info(f"[AUTH] *** HEADER_AUTH_CALLBACK CALLED ***")
        logger.info(f"[AUTH] Received headers count: {len(headers)}")
        logger.info(f"[AUTH] Received headers: {list(headers.keys())}")
        logger.info(f"[AUTH] All headers: {headers}")
        
        # Try different possible header names for the token
        token = (headers.get("x-forwarded-access-token") or 
                headers.get("X-Forwarded-Access-Token") or
                headers.get("authorization"))
        
        # Try different possible header names for email/user
        email = (headers.get("x-forwarded-email") or 
                headers.get("X-Forwarded-Email") or
                headers.get("x-forwarded-user") or 
                headers.get("X-Forwarded-User"))
        
        logger.info(f"[AUTH] Token found: {'Yes' if token else 'No'}")
        logger.info(f"[AUTH] Email found: {email}")
        
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
        logger.warning(f"[AUTH] Available headers: {list(headers.keys())}")
        return None  # No fallback inside Databricks app
else:
    logger.info("Not running on Databricks — skipping header auth")
