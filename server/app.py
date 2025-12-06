"""
BI Hub App - FastAPI Main Application

Serves the React frontend and provides API endpoints for chat with MAS agents.
Following Databricks Apps pattern with React frontend and FastAPI backend.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .routes import api_router

logger = logging.getLogger(__name__)

# Path to frontend build directory
CLIENT_BUILD_DIR = Path(__file__).parent.parent / "client" / "build"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger.info("BI Hub API starting up...")
    yield
    logger.info("BI Hub API shutting down...")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    application = FastAPI(
        title="BI Hub API",
        description="REST API for BI Hub Chat with Mosaic AI Agents",
        version="1.0.0",
        lifespan=lifespan,
        # Don't include docs in production - only API endpoints
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # Configure CORS for frontend development
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative dev port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Include API routes under /api prefix
    application.include_router(api_router, prefix="/api")

    # Global exception handler
    @application.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle uncaught exceptions with user-friendly error messages."""
        logger.exception(f"Unhandled exception: {exc}")

        error_message = str(exc)

        if "401" in error_message or "unauthorized" in error_message.lower():
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized. Please check your credentials."},
            )

        if "connection" in error_message.lower() or "timeout" in error_message.lower():
            return JSONResponse(
                status_code=503,
                content={"detail": "Service unavailable. Please try again later."},
            )

        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again."},
        )

    # Health check endpoint
    @application.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """Health check endpoint."""
        return {"status": "healthy", "service": "bi-hub-api"}

    # Mount static files for React frontend (must be last)
    if CLIENT_BUILD_DIR.exists():
        application.mount(
            "/",
            StaticFiles(directory=str(CLIENT_BUILD_DIR), html=True),
            name="frontend",
        )
    else:
        logger.warning(
            f"Frontend build directory not found at {CLIENT_BUILD_DIR}. "
            "Run 'npm run build' in the client directory."
        )

        # Fallback route for development
        @application.get("/")
        async def root():
            return {
                "message": "BI Hub API",
                "docs": "/api/docs",
                "note": "Frontend not built. Run 'npm run build' in client/",
            }

    return application


# Create the default app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
