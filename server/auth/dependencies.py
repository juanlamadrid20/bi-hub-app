"""
FastAPI Auth Dependencies

Provides dependency injection for authentication and identity.
"""

import logging
from typing import Dict

from fastapi import Request, HTTPException

from ..config import settings
from .identity import Identity, OboTokenSource, PatTokenSource

logger = logging.getLogger(__name__)


def _get_headers_dict(request: Request) -> Dict[str, str]:
    """Convert request headers to dict."""
    return dict(request.headers)


async def get_identity(request: Request) -> Identity:
    """
    FastAPI dependency to get the current user identity.

    Supports two authentication modes:
    - Header Auth (OBO): Uses x-forwarded-* headers from Databricks Apps
    - PAT Auth: Uses configured personal access token (for local dev)

    Returns:
        Identity object with token source for API calls

    Raises:
        HTTPException: If authentication fails
    """
    headers = _get_headers_dict(request)

    if settings.enable_header_auth:
        # On-Behalf-Of (OBO) authentication via forwarded headers
        email = headers.get("x-forwarded-email")
        display_name = headers.get("x-forwarded-preferred-username")
        token = headers.get("x-forwarded-access-token")

        if not token:
            logger.warning("No access token in forwarded headers")
            raise HTTPException(
                status_code=401,
                detail="Authentication required. No access token found.",
            )

        logger.info(f"OBO auth: {email}")

        return Identity(
            email=email,
            display_name=display_name,
            auth_type="obo",
            token_source=OboTokenSource(lambda: headers),
        )

    elif settings.enable_password_auth:
        # PAT authentication (local development)
        pat = settings.pat

        if not pat:
            logger.warning("PAT authentication enabled but no token configured")
            raise HTTPException(
                status_code=401,
                detail="Authentication required. Please configure DATABRICKS_TOKEN.",
            )

        logger.info("PAT auth: local development")

        return Identity(
            email="local@dev",
            display_name="Local Developer",
            auth_type="pat",
            token_source=PatTokenSource(pat),
        )

    else:
        raise HTTPException(
            status_code=500,
            detail="No authentication method configured",
        )




