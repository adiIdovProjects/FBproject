"""
Admin Router - API endpoints for admin analytics dashboard.
All endpoints require admin authentication.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_admin
from backend.api.services.admin_service import AdminService

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
)


@router.get("/dashboard")
async def get_admin_dashboard(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get aggregated admin dashboard metrics"""
    service = AdminService(db)
    return service.get_dashboard_metrics(days)


@router.get("/users")
async def get_user_metrics(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get detailed user metrics"""
    service = AdminService(db)
    return service.get_user_metrics(days)


@router.get("/funnel")
async def get_funnel_metrics(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get onboarding funnel metrics with conversion rates"""
    service = AdminService(db)
    return service.get_funnel_metrics(days)


@router.get("/errors")
async def get_error_logs(
    limit: int = Query(100, description="Number of error logs to return"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get recent error logs from audit trail"""
    service = AdminService(db)
    return service.get_error_logs(limit)


@router.get("/activity")
async def get_recent_activity(
    limit: int = Query(50, description="Number of activity logs to return"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get recent activity from audit trail"""
    service = AdminService(db)
    return service.get_recent_activity(limit)


@router.get("/revenue")
async def get_revenue_placeholder(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Placeholder for Stripe revenue integration (coming soon)"""
    return {
        "message": "Revenue metrics coming soon",
        "mrr": 0,
        "total_revenue": 0,
        "paying_customers": 0,
        "status": "not_integrated"
    }
