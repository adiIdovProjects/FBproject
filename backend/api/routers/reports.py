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
from backend.api.schemas.responses import ReportsComparisonResponse
from backend.api.utils.exceptions import DatabaseError, ValidationError, AppException

router = APIRouter(
    prefix="/api/v1/reports",
    tags=["reports"],
    # TODO: Re-enable authentication later
    # dependencies=[Depends(get_current_user)]
)


@router.get("/compare", response_model=ReportsComparisonResponse)
def get_comparison_report(
    period1_start: date = Query(..., description="Period 1 start date"),
    period1_end: date = Query(..., description="Period 1 end date"),
    period2_start: Optional[date] = Query(None, description="Period 2 start date (optional for comparison)"),
    period2_end: Optional[date] = Query(None, description="Period 2 end date (optional for comparison)"),
    dimension: str = Query("overview", description="Dimension level: overview, campaign, or ad"),
    breakdown: str = Query("none", description="Breakdown type: none, campaign_name, ad_set_name, ad_name, date, week, month"),
    secondary_breakdown: str = Query("none", description="Secondary breakdown dimension (optional): none, campaign_name, ad_set_name, ad_name, date, week, month"),
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

    Filters can be applied to narrow results by campaign, ad set, or ad name.
    """
    # Validate breakdown parameters
    valid_breakdowns = ['none', 'campaign_name', 'ad_set_name', 'ad_name', 'date', 'week', 'month']
    if breakdown not in valid_breakdowns:
        raise ValidationError(
            detail=f"Invalid breakdown '{breakdown}'. Must be one of: {', '.join(valid_breakdowns)}"
        )
    if secondary_breakdown not in valid_breakdowns:
        raise ValidationError(
            detail=f"Invalid secondary_breakdown '{secondary_breakdown}'. Must be one of: {', '.join(valid_breakdowns)}"
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
