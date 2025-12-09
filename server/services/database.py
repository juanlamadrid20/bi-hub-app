"""
Database Service for Lakebase PostgreSQL

Handles connection to Databricks Lakebase (managed PostgreSQL) with OAuth token authentication.
"""

import logging
from typing import Optional
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from databricks.sdk import WorkspaceClient
from databricks.sdk.core import Config
from datetime import datetime, timedelta, timezone
from threading import Lock
import uuid

from ..config import settings

logger = logging.getLogger(__name__)


class Credential:
    """OAuth credential with expiration tracking."""

    def __init__(self, token: str, expiration_time):
        self.token = token
        # Handle both string and datetime expiration times
        if isinstance(expiration_time, str):
            # Parse ISO format string
            try:
                # Try parsing with timezone
                self.expiration_time = datetime.fromisoformat(expiration_time.replace('Z', '+00:00'))
            except ValueError:
                # Fallback: assume UTC and add 1 hour from now
                self.expiration_time = datetime.now(timezone.utc) + timedelta(hours=1)
        elif isinstance(expiration_time, datetime):
            self.expiration_time = expiration_time if expiration_time.tzinfo else expiration_time.replace(tzinfo=timezone.utc)
        else:
            # Fallback: assume 1 hour validity
            self.expiration_time = datetime.now(timezone.utc) + timedelta(hours=1)

    def valid_for(self) -> timedelta:
        """Check how long the credential is valid."""
        return self.expiration_time - datetime.now(timezone.utc)


class LakebaseCredentialProvider:
    """Provides OAuth credentials for Lakebase database access."""

    def __init__(self):
        self.lock = Lock()
        self._cached: Optional[Credential] = None

    def _client(self) -> WorkspaceClient:
        """Get Databricks workspace client."""
        return WorkspaceClient()

    def get_credential(self) -> Credential:
        """Get valid credential, refreshing if needed."""
        with self.lock:
            if self._cached and self._cached.valid_for() > timedelta(minutes=1):
                return self._cached

            w = self._client()
            request_id = str(uuid.uuid4())
            cred = w.database.generate_database_credential(
                request_id=request_id, instance_names=[settings.pg_database_instance]
            )
            self._cached = Credential(token=cred.token, expiration_time=cred.expiration_time)
            logger.info(f"Refreshed database credential, valid until {cred.expiration_time}")
            return self._cached

    def invalidate(self) -> None:
        """Invalidate cached credential."""
        with self.lock:
            self._cached = None


# Global credential provider (lazy initialization)
_credential_provider: Optional[LakebaseCredentialProvider] = None
_engine = None
_SessionLocal = None


def _get_credential_provider() -> LakebaseCredentialProvider:
    """Get or create credential provider."""
    global _credential_provider
    if _credential_provider is None:
        _credential_provider = LakebaseCredentialProvider()
    return _credential_provider


def _get_engine():
    """Get or create database engine (lazy initialization)."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.pg_connection_string,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        @event.listens_for(_engine, "do_connect")
        def provide_token(dialect, conn_rec, cargs, cparams):
            """Inject OAuth token as password on connection."""
            credential = _get_credential_provider().get_credential()
            cparams["password"] = credential.token

    return _engine


def _get_session_factory():
    """Get or create session factory (lazy initialization)."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_get_engine())
    return _SessionLocal


def is_database_configured() -> bool:
    """Check if database is properly configured."""
    return bool(
        settings.pg_database_instance and
        settings.pg_host and
        settings.pg_user and
        settings.pg_database
    )


def get_db() -> Session:
    """
    Dependency for FastAPI to get database session.
    Returns None if database is not configured.
    """
    if not is_database_configured():
        logger.warning("Database not configured - conversation history disabled")
        yield None
        return
    
    SessionLocal = _get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection() -> bool:
    """Test database connection."""
    if not is_database_configured():
        logger.info("Database not configured - skipping connection test")
        return False
    
    try:
        SessionLocal = _get_session_factory()
        with SessionLocal() as db:
            result = db.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("Database connection test successful")
            return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False




