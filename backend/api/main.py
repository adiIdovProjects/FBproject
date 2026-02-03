"""
FastAPI application entry point.

This module initializes the FastAPI application with all routers and middleware.
"""

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import defaultdict
import sys
import os
import logging
import uuid
import time
import asyncio
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
from backend.api.routers import metrics, breakdowns, creatives, export, auth, google_auth, ai, actions, insights, reports, users, sync, accounts, mutations, admin, stripe, activity, public_chat, business_profile, recommendations, pixel_router
from backend.models import create_schema
from backend.utils.db_utils import get_db_engine
from backend.utils.logging_utils import setup_logging, get_logger
from backend.config.base_config import settings

# Initialize structured logging
setup_logging(level="DEBUG" if settings.DEBUG else "INFO")
logger = get_logger(__name__)

# Simple in-memory rate limiter (no external dependencies)
class SimpleRateLimiter:
    """
    Simple in-memory rate limiter using sliding window.
    Thread-safe for async operations.
    """
    def __init__(self, requests_per_minute: int = 60, burst_limit: int = 10):
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit  # Max requests per second
        self.requests = defaultdict(list)  # IP -> list of timestamps
        self._lock = asyncio.Lock()

    async def is_rate_limited(self, client_ip: str) -> bool:
        """Check if client is rate limited. Returns True if should be blocked."""
        async with self._lock:
            now = time.time()
            minute_ago = now - 60
            second_ago = now - 1

            # Clean old entries
            self.requests[client_ip] = [t for t in self.requests[client_ip] if t > minute_ago]

            # Check per-minute limit
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                return True

            # Check burst limit (per-second)
            recent = [t for t in self.requests[client_ip] if t > second_ago]
            if len(recent) >= self.burst_limit:
                return True

            # Record this request
            self.requests[client_ip].append(now)
            return False

    async def cleanup(self):
        """Periodic cleanup of old entries to prevent memory leak."""
        async with self._lock:
            now = time.time()
            minute_ago = now - 60
            empty_ips = []
            for ip, timestamps in self.requests.items():
                self.requests[ip] = [t for t in timestamps if t > minute_ago]
                if not self.requests[ip]:
                    empty_ips.append(ip)
            for ip in empty_ips:
                del self.requests[ip]

# Initialize rate limiters
rate_limiter = SimpleRateLimiter(requests_per_minute=100, burst_limit=15)
# Stricter rate limiter for authentication endpoints (prevents brute force)
auth_rate_limiter = SimpleRateLimiter(requests_per_minute=10, burst_limit=3)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="RESTful API for Facebook Ads performance analytics",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None
)

@app.middleware("http")
async def csrf_protection_middleware(request: Request, call_next):
    """CSRF protection middleware - validates CSRF tokens for state-changing requests."""
    from backend.utils.csrf_utils import CSRFProtection

    # Skip CSRF for safe methods and public endpoints
    safe_methods = ["GET", "HEAD", "OPTIONS"]
    public_paths = ["/api/v1/auth/", "/api/v1/public/", "/ping", "/health", "/docs", "/redoc", "/openapi.json"]

    if request.method in safe_methods or any(request.url.path.startswith(p) for p in public_paths):
        response = await call_next(request)

        # Set CSRF token cookie for authenticated users on GET requests
        if request.method == "GET" and not any(request.url.path.startswith(p) for p in ["/ping", "/health", "/docs", "/redoc"]):
            csrf_token = CSRFProtection.generate_token()
            signed_token = CSRFProtection.create_signed_token(csrf_token)
            response.set_cookie(
                key="csrf_token",
                value=signed_token,
                httponly=False,  # JavaScript needs to read this to send in header
                secure=settings.ENVIRONMENT == "production",
                samesite="lax",
                max_age=86400  # 24 hours
            )
            # Also send plain token in header for client to use
            response.headers["X-CSRF-Token"] = csrf_token

        return response

    # For state-changing methods, validate CSRF token
    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("X-CSRF-Token")

    if not CSRFProtection.validate_request(cookie_token, header_token):
        logger.warning(f"CSRF validation failed for {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
        return JSONResponse(
            status_code=403,
            content={"detail": "CSRF validation failed"}
        )

    return await call_next(request)

@app.middleware("http")
async def request_size_limit_middleware(request: Request, call_next):
    """Request size limit middleware - prevents DoS via large payloads."""
    # Only check size for state-changing methods
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length:
            size_mb = int(content_length) / (1024 * 1024)
            if int(content_length) > 10_000_000:  # 10MB limit
                logger.warning(f"Request too large: {size_mb:.2f}MB from {request.client.host if request.client else 'unknown'}")
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request entity too large. Maximum size is 10MB."}
                )

    return await call_next(request)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware - blocks excessive requests."""
    # Skip rate limiting for health checks and static assets
    skip_paths = ["/ping", "/health", "/docs", "/redoc", "/openapi.json"]
    if any(request.url.path.startswith(p) for p in skip_paths):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"

    # Apply stricter rate limiting for authentication endpoints
    auth_paths = ["/api/v1/auth/", "/api/v1/magic-link/"]
    is_auth_endpoint = any(request.url.path.startswith(p) for p in auth_paths)

    if is_auth_endpoint:
        # Use stricter auth rate limiter (10 req/min, 3 req/sec)
        if await auth_rate_limiter.is_rate_limited(client_ip):
            logger.warning(f"Auth rate limit exceeded for IP: {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many authentication attempts. Please try again in a few minutes."},
                headers={"Retry-After": "300"}  # 5 minutes
            )
    else:
        # Use normal rate limiter (100 req/min, 15 req/sec)
        if await rate_limiter.is_rate_limited(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": "60"}
            )

    return await call_next(request)

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
app.include_router(business_profile.router)
app.include_router(recommendations.router)
app.include_router(pixel_router.router)

@app.get("/ping", tags=["health"])
def ping():
    """Simple ping endpoint without DB dependency."""
    logger.debug("Ping endpoint reached")
    return {"status": "ok", "timestamp": time.time()}

@app.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)):
    """
    Comprehensive health check endpoint.
    Verifies API status, database connectivity, and external API health.
    """
    import requests
    from sqlalchemy import text

    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "checks": {
            "database": "unknown",
            "facebook_api": "unknown",
            "gemini_api": "unknown"
        }
    }

    # Check database
    try:
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        health_status["checks"]["database"] = "unhealthy"
        health_status["status"] = "degraded"

    # Check Facebook API (test Graph API availability)
    try:
        response = requests.get("https://graph.facebook.com/v18.0/", timeout=3)
        if response.status_code == 200:
            health_status["checks"]["facebook_api"] = "healthy"
        else:
            health_status["checks"]["facebook_api"] = "degraded"
    except Exception as e:
        logger.warning(f"Facebook API health check failed: {e}")
        health_status["checks"]["facebook_api"] = "unhealthy"
        # Don't mark overall status as degraded for external API issues

    # Check Gemini API (test if API key is configured)
    if settings.GEMINI_API_KEY:
        try:
            # Just verify API key is set and not obviously invalid
            # Don't make actual API call to avoid usage costs
            if len(settings.GEMINI_API_KEY) > 20:
                health_status["checks"]["gemini_api"] = "configured"
            else:
                health_status["checks"]["gemini_api"] = "misconfigured"
        except Exception:
            health_status["checks"]["gemini_api"] = "misconfigured"
    else:
        health_status["checks"]["gemini_api"] = "not_configured"

    return health_status

# Background task for rate limiter cleanup
async def rate_limiter_cleanup_task():
    """Periodically clean up rate limiter memory."""
    while True:
        await asyncio.sleep(300)  # Every 5 minutes
        await rate_limiter.cleanup()
        await auth_rate_limiter.cleanup()
        logger.debug("Rate limiter cleanup completed")

# Background task for magic link cleanup
async def magic_link_cleanup_task():
    """Periodically clean up expired magic link tokens."""
    while True:
        await asyncio.sleep(86400)  # Every 24 hours (daily cleanup)
        try:
            from backend.api.dependencies import SessionLocal
            from backend.api.repositories.magic_link_repository import MagicLinkRepository

            db = SessionLocal()
            try:
                repo = MagicLinkRepository(db)
                deleted_count = repo.cleanup_expired_tokens(days_old=7)
                logger.info(f"Magic link cleanup: Deleted {deleted_count} expired tokens")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Magic link cleanup failed: {e}", exc_info=True)

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

    # Start background cleanup tasks
    asyncio.create_task(rate_limiter_cleanup_task())
    asyncio.create_task(magic_link_cleanup_task())
    logger.info("✅ Rate limiter enabled (100 req/min, 15 req/sec burst)")
    logger.info("✅ Background cleanup tasks started (rate limiter, magic links)")

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