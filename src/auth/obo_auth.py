"""
On-Behalf-Of (OBO) authentication utilities for Databricks Apps
"""
import os
import logging
from typing import Optional
from dataclasses import dataclass
from databricks.sdk import WorkspaceClient
from databricks.sdk.core import Config

logger = logging.getLogger(__name__)

@dataclass
class OBOUserContext:
    """OBO user context with actual user information"""
    environment: str = "databricks_obo"
    username: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[str] = None
    source: str = "obo_auth"
    user_token: Optional[str] = None
    is_obo_enabled: bool = False

class OBOAuthManager:
    """On-Behalf-Of authentication manager for Databricks Apps"""
    
    def __init__(self):
        self.app_config = Config()
        self.workspace_client = WorkspaceClient(config=self.app_config)
        logger.info("🔐 OBO Auth Manager initialized")
    
    def get_user_token_from_headers(self, headers: dict) -> Optional[str]:
        """Extract user token from X-Forwarded-Access-Token header"""
        try:
            # This is the key header that Databricks Apps provides for OBO
            user_token = headers.get("X-Forwarded-Access-Token")
            if user_token:
                logger.info("🔐 OBO user token found in headers")
                return user_token
            else:
                logger.info("🔐 No OBO user token found in headers")
                return None
        except Exception as e:
            logger.error(f"🔐 Error extracting user token: {e}")
            return None
    
    def get_user_info_from_token(self, user_token: str) -> dict:
        """Get user information from the OBO token"""
        try:
            # Create a temporary workspace client with the user's token
            user_config = Config(
                host=self.app_config.host,
                token=user_token
            )
            user_workspace_client = WorkspaceClient(config=user_config)
            
            # Get current user info
            current_user = user_workspace_client.current_user.me()
            
            return {
                "user_id": current_user.user_name,
                "email": current_user.email if hasattr(current_user, 'email') else None,
                "display_name": current_user.display_name if hasattr(current_user, 'display_name') else current_user.user_name
            }
        except Exception as e:
            logger.error(f"�� Error getting user info from token: {e}")
            return {
                "user_id": "unknown_user",
                "email": None,
                "display_name": "Unknown User"
            }
    
    def get_user_context(self, headers: dict = None) -> OBOUserContext:
        """Get OBO user context from headers"""
        if not headers:
            logger.info("🔐 No headers provided for OBO auth")
            return OBOUserContext(is_obo_enabled=False)
        
        user_token = self.get_user_token_from_headers(headers)
        
        if not user_token:
            logger.info("�� OBO authentication not available")
            return OBOUserContext(is_obo_enabled=False)
        
        # Get user information from the token
        user_info = self.get_user_info_from_token(user_token)
        
        logger.info(f"🔐 OBO user authenticated: {user_info['user_id']}")
        
        return OBOUserContext(
            environment="databricks_obo",
            username=user_info["user_id"],
            email=user_info["email"],
            user_id=user_info["user_id"],
            source="obo_auth",
            user_token=user_token,
            is_obo_enabled=True
        )
    
    def create_user_workspace_client(self, user_token: str) -> WorkspaceClient:
        """Create a workspace client using the user's token for OBO operations"""
        user_config = Config(
            host=self.app_config.host,
            token=user_token
        )
        return WorkspaceClient(config=user_config)

# Global instance
obo_auth_manager = OBOAuthManager()
