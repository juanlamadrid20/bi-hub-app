import chainlit as cl
from config import settings
from auth.identity import Identity, OboTokenSource, PatTokenSource
from typing import Dict
from utils.logging import logger


def _headers_getter() -> Dict[str, str]:
    request = cl.user_session.get("request")
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
