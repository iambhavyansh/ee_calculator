from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.router import v1_router
from backend.app.config import settings
from backend.app.core.errors import register_error_handlers
from backend.app.core.execution.pools import execution_pool_manager
from backend.app.logging_config import setup_logging
from backend.app.registry.calculator_registry import registry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycle."""
    # 1. Initialize logging
    setup_logging()
    logger.info("Starting %s in %s environment", settings.APP_NAME, settings.APP_ENV)

    # 2. Validate registry metadata
    logger.info("Validating registered calculators...")
    for meta in registry.get_all_metadata():
        logger.info("Registered calculator: %s (%s)", meta.id, meta.name)

    # 3. Start worker process pool
    execution_pool_manager.start()

    yield

    # 4. Graceful shutdown
    logger.info("Shutting down worker pools...")
    execution_pool_manager.shutdown()


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        lifespan=lifespan,
    )

    # Register CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Retry-After"],
    )

    # Register custom error handlers
    register_error_handlers(app)

    # Include versioned API router
    app.include_router(v1_router)

    return app


app = create_app()

