"""
Breakdowns API router.

This module defines FastAPI endpoints for demographic and placement breakdowns.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from api.dependencies import get_db, get_current_user
from api.services.metrics_service import MetricsService
from api.schemas.responses import (
    AgeGenderBreakdown,
    PlacementBreakdown,
    CountryBreakdown,
    AdsetBreakdown
)

router = APIRouter(
    prefix="/api/v1/breakdowns", 
    tags=["breakdowns"],
    dependencies=[Depends(get_current_user)]
)


@router.get(
    "/age-gender",
    response_model=List[AgeGenderBreakdown],
    summary="Get age and gender breakdown",
    description="Returns metrics broken down by age group and gender"
)
def get_age_gender_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    group_by: str = Query('both', regex="^(age|gender|both)$", description="Group by age, gender, or both"),
    db: Session = Depends(get_db)
):
    """
    Get demographic performance breakdown.

    Returns metrics aggregated by age group and gender combinations.
    """
    try:
        service = MetricsService(db)
        return service.get_age_gender_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            group_by=group_by
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get age/gender breakdown: {str(e)}")


@router.get(
    "/placement",
    response_model=List[PlacementBreakdown],
    summary="Get placement breakdown",
    description="Returns metrics broken down by ad placement"
)
def get_placement_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    db: Session = Depends(get_db)
):
    """
    Get placement performance breakdown.

    Returns metrics aggregated by placement (Facebook Feed, Instagram Stories, etc.).
    """
    try:
        service = MetricsService(db)
        return service.get_placement_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get placement breakdown: {str(e)}")


@router.get(
    "/country",
    response_model=List[CountryBreakdown],
    summary="Get country breakdown",
    description="Returns metrics broken down by country"
)
def get_country_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    top_n: int = Query(10, ge=1, le=50, description="Number of top countries to return"),
    db: Session = Depends(get_db)
):
    """
    Get geographic performance breakdown.

    Returns top N countries by spend with their performance metrics.
    """
    try:
        service = MetricsService(db)
        return service.get_country_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            top_n=top_n
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get country breakdown: {str(e)}")
@router.get(
    "/adset",
    response_model=List[AdsetBreakdown],
    summary="Get adset breakdown",
    description="Returns metrics broken down by adset including targeting information"
)
def get_adset_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    db: Session = Depends(get_db)
):
    """
    Get adset performance breakdown.
    """
    try:
        service = MetricsService(db)
        return service.get_adset_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get adset breakdown: {str(e)}")
