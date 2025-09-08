"""
Hybrid authentication manager that supports both simple auth and OBO
"""
import os
import logging
from typing import Optional
from dataclasses import dataclass
from .auth_utils import auth_manager, UserContext
from .obo_auth import obo_auth_manager, OBOUserContext

logger = logging.getLogger(__name__)

@dataclass
class HybridUserContext:
    """Hybrid user context that can be either simple or OBO"""
    environment: str
    username: Optional[str]
    email: Optional[str]
    user_id: Optional[str]
    source: str
    user_token: Optional[str] = None
    is_obo_enabled: bool = False

class HybridAuthManager:
    """Hybrid authentication manager supporting both simple and OBO auth"""
    
    def __init__(self):
        self.enable_obo = os.getenv('ENABLE_OBO_AUTH', 'false').lower() == 'true'
        logger.info(f"🔐 Hybrid Auth Manager initialized - OBO: {self.enable_obo}")
    
    def get_user_context(self, chainlit_user=None, headers: dict = None) -> HybridUserContext:
        """Get user context using OBO if available, otherwise fall back to simple auth"""
        
        # Try OBO first if enabled
        if self.enable_obo and headers:
            obo_context = obo_auth_manager.get_user_context(headers)
            if obo_context.is_obo_enabled:
                logger.info(f"🔐 Using OBO authentication for user: {obo_context.user_id}")
                return HybridUserContext(
                    environment=obo_context.environment,
                    username=obo_context.username,
                    email=obo_context.email,
                    user_id=obo_context.user_id,
                    source=obo_context.source,
                    user_token=obo_context.user_token,
                    is_obo_enabled=True
                )
        
        # Fall back to simple auth
        simple_context = auth_manager.get_user_context(chainlit_user)
        logger.info(f"🔐 Using simple authentication for user: {simple_context.user_id}")
        
        return HybridUserContext(
            environment=simple_context.environment,
            username=simple_context.username,
            email=simple_context.email,
            user_id=simple_context.user_id,
            source=simple_context.source,
            is_obo_enabled=False
        )

# Global instance
hybrid_auth_manager = HybridAuthManager()
