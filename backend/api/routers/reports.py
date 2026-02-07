"""
Reports Router
Handles comparison reports and analytics endpoints
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.api.dependencies import get_db, get_current_user
from backend.api.services.reports_service import ReportsService
from backend.api.services.my_report_service import MyReportService
from backend.api.schemas.responses import ReportsComparisonResponse
from backend.api.utils.exceptions import DatabaseError, ValidationError, AppException
from backend.api.repositories.user_repository import UserRepository
from pydantic import BaseModel
from typing import List


class MyReportPreferencesRequest(BaseModel):
    """Request body for saving report preferences."""
    selected_metrics: List[str] = ['spend', 'conversions', 'cpa']
    chart_type: str = 'none'
    include_recommendations: bool = True
    email_schedule: str = 'none'

router = APIRouter(
    prefix="/api/v1/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/compare", response_model=ReportsComparisonResponse)
def get_comparison_report(
    period1_start: date = Query(..., description="Period 1 start date"),
    period1_end: date = Query(..., description="Period 1 end date"),
    period2_start: Optional[date] = Query(None, description="Period 2 start date (optional for comparison)"),
    period2_end: Optional[date] = Query(None, description="Period 2 end date (optional for comparison)"),
    dimension: str = Query("overview", description="Dimension level: overview, campaign, or ad"),
    breakdown: str = Query("none", description="Breakdown type: none, campaign_name, ad_set_name, ad_name, date, week, month"),
    secondary_breakdown: str = Query("none", description="Secondary breakdown dimension (optional)"),
    tertiary_breakdown: str = Query("none", description="Tertiary breakdown dimension (optional, for 3D reports)"),
    campaign_filter: Optional[str] = Query(None, description="Filter by campaign name (partial match)"),
    ad_set_filter: Optional[str] = Query(None, description="Filter by ad set name (partial match)"),
    ad_filter: Optional[str] = Query(None, description="Filter by ad name (partial match)"),
    account_id: Optional[str] = Query(None, description="Filter by specific account ID"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comparison report between two time periods.

    Supports breakdown types:
    - none: Overall overview
    - campaign_name: By campaign name
    - ad_set_name: By ad set name
    - ad_name: By ad name
    - date: By date
    - week: By week
    - month: By month
    - placement: By placement (special breakdown)
    - platform: By platform (special breakdown)
    - age: By age group (special breakdown)
    - gender: By gender (special breakdown)
    - country: By country (special breakdown)

    Up to 3 breakdowns can be combined (entity + time + audience).
    Filters can be applied to narrow results by campaign, ad set, or ad name.
    """
    # Validate breakdown parameters
    valid_breakdowns = ['none', 'campaign_name', 'ad_set_name', 'ad_name', 'date', 'week', 'month', 'placement', 'platform', 'age', 'gender', 'country']
    if breakdown not in valid_breakdowns:
        raise ValidationError(
            detail=f"Invalid breakdown '{breakdown}'. Must be one of: {', '.join(valid_breakdowns)}"
        )
    if secondary_breakdown not in valid_breakdowns:
        raise ValidationError(
            detail=f"Invalid secondary_breakdown '{secondary_breakdown}'. Must be one of: {', '.join(valid_breakdowns)}"
        )
    if tertiary_breakdown not in valid_breakdowns:
        raise ValidationError(
            detail=f"Invalid tertiary_breakdown '{tertiary_breakdown}'. Must be one of: {', '.join(valid_breakdowns)}"
        )

    # Validate date ranges
    if period1_start > period1_end:
        raise ValidationError(detail="Period 1 start date must be before end date")
    if period2_start and period2_end and period2_start > period2_end:
        raise ValidationError(detail="Period 2 start date must be before end date")

    try:
        # Initialize service
        service = ReportsService(db, current_user.id)

        # Get comparison data
        comparison_data = service.get_comparison_data(
            period1_start=period1_start,
            period1_end=period1_end,
            period2_start=period2_start,
            period2_end=period2_end,
            dimension=dimension,
            breakdown=breakdown,
            secondary_breakdown=secondary_breakdown,
            tertiary_breakdown=tertiary_breakdown,
            campaign_filter=campaign_filter,
            ad_set_filter=ad_set_filter,
            ad_filter=ad_filter,
            account_id=account_id
        )

        return comparison_data
    except ValidationError:
        raise
    except Exception as e:
        raise DatabaseError(detail=f"Failed to generate comparison report: {str(e)}")


# ============================================
# My Report Endpoints (Simple Report Builder)
# ============================================

def _get_user_account_ids(db: Session, user_id: int) -> List[int]:
    """Helper to get account IDs for a user."""
    user_repo = UserRepository(db)
    return user_repo.get_user_account_ids(user_id) or []


@router.get("/my-report")
def get_my_report(
    account_id: Optional[str] = Query(None, description="Optional specific account ID"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's report preferences and preview data.
    Returns metrics, chart data, and recommendations.
    """
    try:
        # Get account IDs
        account_ids = _get_user_account_ids(db, current_user.id)
        if account_id:
            account_ids = [int(account_id)] if int(account_id) in account_ids else []

        service = MyReportService(db, current_user.id, account_ids)

        # Get preferences
        prefs = service.get_user_preferences()

        # Get preview data
        selected_metrics = prefs.selected_metrics if prefs else ['spend', 'conversions', 'cpa']
        preview = service.get_report_preview(selected_metrics)

        return {
            'preferences': {
                'selected_metrics': prefs.selected_metrics if prefs else ['spend', 'conversions', 'cpa'],
                'chart_type': prefs.chart_type if prefs else 'none',
                'include_recommendations': prefs.include_recommendations if prefs else True,
                'email_schedule': prefs.email_schedule if prefs else 'none'
            } if prefs else None,
            'preview': preview
        }
    except Exception as e:
        raise DatabaseError(detail=f"Failed to get my report: {str(e)}")


@router.post("/my-report/preferences")
def save_my_report_preferences(
    request: MyReportPreferencesRequest,
    account_id: Optional[str] = Query(None, description="Optional specific account ID"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save user's report configuration.
    """
    try:
        # Validate selected_metrics
        valid_metrics = ['spend', 'conversions', 'cpa', 'clicks', 'impressions', 'ctr', 'roas', 'budget_status']
        for metric in request.selected_metrics:
            if metric not in valid_metrics:
                raise ValidationError(detail=f"Invalid metric '{metric}'. Valid: {', '.join(valid_metrics)}")

        # Validate chart_type
        if request.chart_type not in ['none', 'spend', 'conversions']:
            raise ValidationError(detail="chart_type must be 'none', 'spend', or 'conversions'")

        # Validate email_schedule
        if request.email_schedule not in ['none', 'daily', 'weekly']:
            raise ValidationError(detail="email_schedule must be 'none', 'daily', or 'weekly'")

        # Get account IDs
        account_ids = _get_user_account_ids(db, current_user.id)
        if account_id:
            account_ids = [int(account_id)] if int(account_id) in account_ids else []

        service = MyReportService(db, current_user.id, account_ids)

        prefs = service.save_preferences(
            selected_metrics=request.selected_metrics,
            chart_type=request.chart_type,
            include_recommendations=request.include_recommendations,
            email_schedule=request.email_schedule
        )

        return {
            'success': True,
            'preferences': {
                'selected_metrics': prefs.selected_metrics,
                'chart_type': prefs.chart_type,
                'include_recommendations': prefs.include_recommendations,
                'email_schedule': prefs.email_schedule
            }
        }
    except ValidationError:
        raise
    except Exception as e:
        raise DatabaseError(detail=f"Failed to save preferences: {str(e)}")


@router.get("/my-report/recommendations")
def get_recommendations(
    account_id: Optional[str] = Query(None, description="Optional specific account ID"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simple recommendations for homepage tips card.
    Returns 1-2 actionable recommendations.
    """
    try:
        # Get account IDs
        account_ids = _get_user_account_ids(db, current_user.id)
        if account_id:
            account_ids = [int(account_id)] if int(account_id) in account_ids else []

        service = MyReportService(db, current_user.id, account_ids)

        recommendations = service.generate_recommendations(max_count=2)

        return {
            'recommendations': recommendations
        }
    except Exception as e:
        raise DatabaseError(detail=f"Failed to get recommendations: {str(e)}")
