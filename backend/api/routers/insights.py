"""
Insights Router
Provides AI-powered insights and recommendations for marketing performance
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from api.dependencies import get_db, get_current_user
from api.services.insights_service import InsightsService

router = APIRouter(
    prefix="/api/v1/insights", 
    tags=["insights"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/summary")
def get_insights_summary(
    start_date: date = Query(..., description="Start date for analysis"),
    end_date: date = Query(..., description="End date for analysis"),
    page_context: str = Query("dashboard", description="Page context: dashboard, campaigns, or creatives"),
    campaign_filter: Optional[str] = Query(None, description="Filter to specific campaign name"),
    breakdown_type: Optional[str] = Query(None, description="Breakdown type: adset, platform, placement, age-gender, country"),
    breakdown_group_by: Optional[str] = Query(None, description="For age-gender breakdown: age, gender, or both"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get summary insights for mini cards on dashboard pages.
    Returns 2-3 quick, actionable insights with caching (5min with filters, 1-hour without).

    Supports filtering by campaign name and breakdown analysis.
    User-specific: Only analyzes accounts linked to the current user.
    """
    try:
        service = InsightsService(db)
        return service.get_summary_insights(
            start_date,
            end_date,
            page_context,
            campaign_filter=campaign_filter,
            breakdown_type=breakdown_type,
            breakdown_group_by=breakdown_group_by,
            user_id=current_user.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@router.get("/deep-analysis")
def get_deep_insights(
    start_date: date = Query(..., description="Start date for analysis"),
    end_date: date = Query(..., description="End date for analysis"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get comprehensive deep analysis for dedicated insights page.
    Returns detailed executive summary, findings, trends, and recommendations.
    User-specific: Only analyzes accounts linked to the current user.
    """
    try:
        service = InsightsService(db)
        return service.get_deep_analysis(start_date, end_date, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate deep analysis: {str(e)}")
