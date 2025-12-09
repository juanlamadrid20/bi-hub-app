"""
Auth Routes

Provides endpoints for authentication status and user info.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional

from ..auth.dependencies import get_identity
from ..auth.identity import Identity
from ..config import settings

router = APIRouter()


class UserResponse(BaseModel):
    """Current user information."""

    email: Optional[str] = None
    display_name: Optional[str] = None
    auth_type: str  # "obo" or "pat"


class AuthStatusResponse(BaseModel):
    """Authentication status."""

    authenticated: bool
    user: Optional[UserResponse] = None
    logout_url: Optional[str] = None


@router.get("/me", response_model=UserResponse)
async def get_current_user(identity: Identity = Depends(get_identity)) -> UserResponse:
    """
    Get the current authenticated user.

    Returns user email, display name, and auth type.
    """
    return UserResponse(
        email=identity.email,
        display_name=identity.display_name,
        auth_type=identity.auth_type,
    )


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(request: Request) -> AuthStatusResponse:
    """
    Get authentication status without requiring auth.

    Useful for checking if user is logged in before making API calls.
    Returns logout URL for Databricks Apps.
    """
    try:
        identity = await get_identity(request)

        # Build logout URL for Databricks Apps
        logout_url = None
        if settings.enable_header_auth and settings.databricks_host:
            # Databricks Apps logout redirects to workspace login
            host = settings.databricks_host.rstrip("/")
            logout_url = f"{host}/login/logout"

        return AuthStatusResponse(
            authenticated=True,
            user=UserResponse(
                email=identity.email,
                display_name=identity.display_name,
                auth_type=identity.auth_type,
            ),
            logout_url=logout_url,
        )
    except Exception:
        return AuthStatusResponse(
            authenticated=False,
            user=None,
            logout_url=None,
        )
