"""
Simple authentication utilities for Spirit Airlines AI Agent
"""
import os
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class UserContext:
    """Simple user context information"""
    environment: str = "simple"
    username: Optional[str] = "admin"
    email: Optional[str] = "admin@spirit-airlines.com"
    user_id: Optional[str] = "admin"
    source: str = "simple_auth"

class AuthManager:
    """Simple authentication manager"""
    
    def __init__(self):
        logger.info("🔐 Simple Auth Manager initialized")
    
    def get_user_context(self, chainlit_user=None) -> UserContext:
        """Get user context based on Chainlit user or default to admin"""
        if chainlit_user and hasattr(chainlit_user, 'identifier'):
            # Use the actual authenticated user from Chainlit
            user_id = chainlit_user.identifier
            username = user_id
            email = getattr(chainlit_user, 'metadata', {}).get('email', f"{user_id}@spirit-airlines.com")
            
            logger.info(f"🔐 Using authenticated user context: {user_id}")
            return UserContext(
                environment="simple",
                username=username,
                email=email,
                user_id=user_id,
                source="simple_auth"
            )
        else:
            # Fallback to default admin user
            logger.info("🔐 Using default admin user context")
            return UserContext()

# Global instance
auth_manager = AuthManager()
