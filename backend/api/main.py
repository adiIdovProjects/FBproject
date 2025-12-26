"""
FastAPI application entry point.

This module initializes the FastAPI application with all routers and middleware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.routers import metrics, breakdowns, creatives, export, auth, google_auth
from models import create_schema
from utils.db_utils import get_db_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Facebook Ads Analytics API",
    description="RESTful API for Facebook Ads performance analytics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# In production, replace with your frontend domain
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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

# Health check endpoint
@app.get("/", tags=["health"])
def health_check():
    """
    Health check endpoint.

    Returns API status and version information.
    """
    return {
        "status": "healthy",
        "service": "Facebook Ads Analytics API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["health"])
def health():
    """Alternative health check endpoint."""
    return {"status": "ok"}


# Startup event
@app.on_event("startup")
async def startup_event():
    """
    Runs on application startup.

    Logs startup information and performs any necessary initialization.
    """
    logger.info("=" * 60)
    logger.info("🚀 Facebook Ads Analytics API Starting Up")
    logger.info("=" * 60)
    
    # Ensure schema exists
    try:
        engine = get_db_engine()
        create_schema(engine)
        logger.info("✅ Database schema verified/created")
    except Exception as e:
        logger.error(f"❌ Failed to verify/create schema: {e}")
        
    logger.info(f"API Documentation: http://localhost:8000/docs")
    logger.info(f"CORS Origins: {CORS_ORIGINS}")
    logger.info("=" * 60)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs on application shutdown.

    Performs cleanup tasks if necessary.
    """
    logger.info("🛑 Facebook Ads Analytics API Shutting Down")


if __name__ == "__main__":
    import uvicorn

    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (development only)
        log_level="info"
    )
