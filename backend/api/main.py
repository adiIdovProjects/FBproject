"""
FastAPI application entry point.

This module initializes the FastAPI application with all routers and middleware.
"""

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import sys
import os
import logging
import uuid
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.dependencies import get_db
from sqlalchemy.orm import Session
from api.routers import metrics, breakdowns, creatives, export, auth, google_auth, ai, actions, insights, reports, users
from models import create_schema
from utils.db_utils import get_db_engine
from utils.logging_utils import setup_logging, get_logger
from config.base_config import settings

# Initialize structured logging
setup_logging(level="DEBUG" if settings.DEBUG else "INFO")
logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="RESTful API for Facebook Ads performance analytics",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None
)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    print(f"DEBUG: log_requests starting for {request.method} {request.url.path}")
    start_time = time.time()
    
    # Try to get user_id if token is present
    user_id = "anonymous"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from api.utils.security import ALGORITHM
            from jose import jwt
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub", "anonymous")
        except Exception as e:
            # print(f"DEBUG: Token decode failed: {e}")
            pass

    # Log request start
    print(f"DEBUG: Processing request {request.method} {request.url.path}")
    logger.info(
        f"Request started: {request.method} {request.url.path}",
        extra={
            "request_id": request_id, 
            "user_id": user_id,
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown"
        }
    )

    print(f"DEBUG: calling next for {request.url.path}")
    response = await call_next(request)
    print(f"DEBUG: response status for {request.url.path} is {response.status_code}")
    
    process_time = time.time() - start_time
    print(f"DEBUG: Finished request {request.method} {request.url.path} - Status: {response.status_code}")
    logger.info(
        f"Request finished: {request.method} {request.url.path} - {response.status_code}",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "status_code": response.status_code,
            "duration_ms": round(process_time * 1000, 2)
        }
    )
    
    response.headers["X-Request-ID"] = request_id
    return response

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
