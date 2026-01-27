"""
FastAPI application entry point.

This module initializes the FastAPI application with all routers and middleware.
"""

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
# from slowapi import Limiter, _rate_limit_exceeded_handler
# from slowapi.util import get_remote_address
# from slowapi.errors import RateLimitExceeded
import sys
import os
import logging
import uuid
import time
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from project root
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Initialize Sentry for error tracking (production only)
sentry_dsn = os.getenv('SENTRY_DSN')
if sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv('ENVIRONMENT', 'development'),
        traces_sample_rate=0.1,  # 10% of requests for performance monitoring
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
    )



from backend.api.dependencies import get_db
from sqlalchemy.orm import Session
from backend.api.routers import metrics, breakdowns, creatives, export, auth, google_auth, ai, actions, insights, reports, users, sync, accounts, mutations, admin, stripe, activity, public_chat
from backend.models import create_schema
from backend.utils.db_utils import get_db_engine
from backend.utils.logging_utils import setup_logging, get_logger
from backend.config.base_config import settings

# Initialize structured logging
setup_logging(level="DEBUG" if settings.DEBUG else "INFO")
logger = get_logger(__name__)

# Initialize rate limiter with in-memory storage (no Redis required)
# DISABLED - causing backend to hang
# limiter = Limiter(
#     key_func=get_remote_address,
#     storage_uri="memory://"  # Use in-memory storage instead of Redis
# )

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="RESTful API for Facebook Ads performance analytics",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Log request start
    logger.info(
        f"Request started: {request.method} {request.url.path}",
        extra={
            "request_id": request_id, 
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown"
        }
    )

    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"Request finished: {request.method} {request.url.path} - {response.status_code}",
        extra={
            "request_id": request_id, 
            "status_code": response.status_code,
            "duration_ms": round(process_time * 1000, 2)
        }
    )
    
    response.headers["X-Request-ID"] = request_id
    return response

# Add rate limiter to app state
# DISABLED - causing backend to hang
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS - explicit methods and headers for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Include routers
app.include_router(metrics.router)
app.include_router(breakdowns.router)
app.include_router(creatives.router)
app.include_router(export.router)
app.include_router(auth.router)
app.include_router(google_auth.router)
app.include_router(ai.router)
app.include_router(actions.router)
app.include_router(insights.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(sync.router)
app.include_router(accounts.router)
app.include_router(mutations.router)
app.include_router(admin.router)
app.include_router(stripe.router)
app.include_router(activity.router)
app.include_router(public_chat.router)

@app.get("/ping", tags=["health"])
def ping():
    """Simple ping endpoint without DB dependency."""
    logger.debug("Ping endpoint reached")
    return {"status": "ok", "timestamp": time.time()}

@app.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)):
    """
    Enhanced health check endpoint.
    Verifies API status and database connectivity.
    """
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "database": "disconnected"
    }
    
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        health_status["status"] = "degraded"
        
    return health_status

# Startup event
@app.on_event("startup")
async def startup_event():
    """
    Runs on application startup.
    """
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.APP_NAME} Starting Up")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info("=" * 60)

    # SECURITY: Production safety checks
    if settings.ENVIRONMENT == "production":
        # Block weak JWT secret in production
        if settings.JWT_SECRET_KEY == "dev-only-secret-change-in-production":
            logger.critical("❌ FATAL: JWT_SECRET_KEY is not set! Cannot start in production with default secret.")
            raise RuntimeError("JWT_SECRET_KEY must be configured in production")

        # Block auth bypass in production
        if settings.DEV_BYPASS_AUTH:
            logger.critical("❌ FATAL: DEV_BYPASS_AUTH=True is not allowed in production!")
            raise RuntimeError("DEV_BYPASS_AUTH must be False in production")

        logger.info("✅ Security checks passed")
    else:
        # Development mode warnings
        if settings.DEV_BYPASS_AUTH:
            logger.warning("⚠️ DEV_BYPASS_AUTH is enabled - authentication bypassed!")
        if settings.JWT_SECRET_KEY == "dev-only-secret-change-in-production":
            logger.warning("⚠️ Using development JWT secret - change for production!")

    # Ensure schema exists
    try:
        engine = get_db_engine()
        create_schema(engine)
        logger.info("✅ Database schema verified/created")
    except Exception as e:
        logger.error(f"❌ Failed to verify/create schema: {e}")

    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")
    logger.info("=" * 60)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs on application shutdown.
    """
    logger.info(f"🛑 {settings.APP_NAME} Shutting Down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=settings.DEBUG,
        log_level="info"
    )