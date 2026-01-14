"""
Admin Router - API endpoints for admin analytics dashboard.
All endpoints require admin authentication.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_admin
from backend.api.services.admin_service import AdminService
from backend.api.services.activity_service import ActivityService
from backend.api.repositories.subscription_repository import SubscriptionRepository

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
async def get_revenue_metrics(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get revenue and subscription metrics"""
    service = AdminService(db)
    return service.get_revenue_metrics(days)


# ==================== User Management Endpoints ====================

@router.get("/users/search")
async def search_users(
    q: str = Query(..., description="Search query (email, name, or user ID)"),
    limit: int = Query(50, description="Max results to return"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Search users by email, name, or ID"""
    service = ActivityService(db)
    return service.search_users(q, limit)


@router.get("/users/list")
async def get_users_list(
    limit: int = Query(100, description="Number of users per page"),
    offset: int = Query(0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get paginated list of all users"""
    service = ActivityService(db)
    return service.get_all_users(limit, offset)


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get comprehensive user detail"""
    service = ActivityService(db)
    user = service.get_user_detail(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    limit: int = Query(100, description="Number of events to return"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get user activity timeline"""
    service = ActivityService(db)
    return service.get_user_activity_timeline(user_id, limit)


@router.get("/users/{user_id}/page-views")
async def get_user_page_views(
    user_id: int,
    limit: int = Query(100, description="Number of page views to return"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get user page view history"""
    service = ActivityService(db)
    return service.get_user_page_views(user_id, limit)


@router.get("/users/{user_id}/subscription-history")
async def get_user_subscription_history(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get user subscription history"""
    service = ActivityService(db)
    return service.get_user_subscription_history(user_id)


@router.get("/subscriptions")
async def get_subscription_metrics(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get subscription metrics (plan distribution, status counts)"""
    repo = SubscriptionRepository(db)
    return repo.get_subscription_stats()


# ==================== Account Health Endpoints ====================

@router.get("/accounts/health")
async def get_account_health(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get account health overview"""
    service = AdminService(db)
    return service.get_account_health()


# ==================== Feature & Activity Analytics ====================

@router.get("/features")
async def get_feature_adoption(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get feature adoption metrics"""
    service = AdminService(db)
    return service.get_feature_adoption(days)


@router.get("/errors/trends")
async def get_error_trends(
    days: int = Query(30, description="Lookback period in days"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get error trends over time"""
    service = AdminService(db)
    return service.get_error_trends(days)
