import chainlit as cl
from config import settings
from utils.logging import logger
from typing import Optional
from auth.identity import PatTokenSource, Identity
from config import settings

users = {
    "admin": "admin",
    "tester": "tester",
}

if settings.enable_password_auth:
    @cl.password_auth_callback
    def auth_from_password(username: str, password: str) -> Optional[cl.User]:
        if (username, password) in users.items():
            logger.info(f"[AUTH] Password auth success for user: {username}")
            
            user = cl.User(
                identifier=username,
                metadata={"auth_type": "password"},
                display_name=username,
                email=username + "@example.com",
                provider="credentials"
            )
            return user

        logger.warning(f"[AUTH] Password auth failed for user: {username}")
        return None
else:
    logger.info("Password auth is disabled")