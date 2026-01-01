"""
Metrics API router.

This module defines the FastAPI endpoints for metrics operations.
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
from api.schemas.requests import CampaignStatus, Granularity
from api.schemas.responses import (
    MetricsOverviewResponse,
    CampaignMetrics,
    CampaignComparisonMetrics,
    TimeSeriesDataPoint,
    AgeGenderBreakdown,
    PlacementBreakdown,
    CountryBreakdown,
    CreativeMetrics,
    ErrorResponse,
    AdsetBreakdown
)

router = APIRouter(
    prefix="/api/v1/metrics", 
    tags=["metrics"],
    dependencies=[Depends(get_current_user)]
)


@router.get(
    "/overview",
    response_model=MetricsOverviewResponse,
    summary="Get high-level metrics overview",
    description="Returns aggregated metrics for a date range with optional period comparison"
)
def get_overview(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    compare_to_previous: bool = Query(False, description="Include previous period comparison"),
    campaign_status: CampaignStatus = Query(CampaignStatus.ALL, description="Filter by campaign status"),
    db: Session = Depends(get_db)
):
    """
    Get high-level KPIs for the specified date range.

    Returns metrics like spend, impressions, clicks, CTR, CPC, CPM, ROAS, CPA.
    Optionally includes comparison with the previous period of equal length.
    """
    try:
        service = MetricsService(db)
        return service.get_overview_metrics(
            start_date=start_date,
            end_date=end_date,
            compare_to_previous=compare_to_previous,
            campaign_status=campaign_status.value if campaign_status != CampaignStatus.ALL else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get overview metrics: {str(e)}")


@router.get(
    "/campaigns",
    response_model=List[CampaignMetrics],
    summary="Get campaign-level breakdown",
    description="Returns metrics broken down by campaign"
)
def get_campaigns(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status (can specify multiple)"),
    sort_by: str = Query("spend", description="Metric to sort by (spend, roas, ctr, etc.)"),
    sort_direction: str = Query("desc", description="Sort direction (asc or desc)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """
    Get campaign-level performance metrics.

    Returns a breakdown of metrics by campaign, sorted by the specified metric.
    """
    try:
        service = MetricsService(db)
        return service.get_campaign_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_status=status,
            sort_by=sort_by,
            sort_direction=sort_direction,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get campaign breakdown: {str(e)}")


@router.get(
    "/campaigns/comparison",
    response_model=List[CampaignComparisonMetrics],
    summary="Get campaign-level breakdown with comparison",
    description="Returns metrics broken down by campaign with side-by-side period comparison"
)
def get_campaigns_comparison(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status (can specify multiple)"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
    sort_by: str = Query("spend", description="Metric to sort by (spend, roas, ctr, etc.)"),
    sort_direction: str = Query("desc", description="Sort direction (asc or desc)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """
    Get campaign-level performance metrics with period comparison.

    Returns a breakdown of metrics by campaign, including comparison with the previous period.
    """
    try:
        service = MetricsService(db)
        return service.get_campaign_comparison(
            start_date=start_date,
            end_date=end_date,
            campaign_status=status,
            search_query=search,
            sort_by=sort_by,
            sort_direction=sort_direction,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get campaign comparison: {str(e)}")


@router.get(
    "/trend",
    response_model=List[TimeSeriesDataPoint],
    summary="Get time series trend data",
    description="Returns daily/weekly/monthly time series data"
)
def get_trend(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    granularity: Granularity = Query(Granularity.DAY, description="Time aggregation level"),
    metrics: Optional[List[str]] = Query(None, description="Metrics to include (optional, returns all)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    db: Session = Depends(get_db)
):
    """
    Get time series data for charting.

    Returns metrics aggregated by day, week, or month for the specified date range.
    """
    try:
        service = MetricsService(db)
        return service.get_time_series(
            start_date=start_date,
            end_date=end_date,
            granularity=granularity.value,
            metrics=metrics,
            campaign_id=campaign_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get time series: {str(e)}")


@router.get(
    "/breakdowns/age-gender",
    response_model=List[AgeGenderBreakdown],
    summary="Get age and gender breakdown",
    description="Returns metrics broken down by age group and gender"
)
def get_age_gender_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    group_by: str = Query('both', regex="^(age|gender|both)$", description="Group by age, gender, or both"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
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
            group_by=group_by,
            campaign_status=status,
            search_query=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get age/gender breakdown: {str(e)}")


@router.get(
    "/breakdowns/placement",
    response_model=List[PlacementBreakdown],
    summary="Get placement breakdown",
    description="Returns metrics broken down by ad placement"
)
def get_placement_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
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
            campaign_id=campaign_id,
            campaign_status=status,
            search_query=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get placement breakdown: {str(e)}")


@router.get(
    "/breakdowns/platform",
    response_model=List[PlacementBreakdown],
    summary="Get platform breakdown",
    description="Returns metrics broken down by platform (Facebook, Instagram, etc.)"
)
def get_platform_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
    db: Session = Depends(get_db)
):
    """
    Get platform performance breakdown.

    Returns metrics aggregated by platform.
    """
    try:
        service = MetricsService(db)
        return service.get_platform_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            campaign_status=status,
            search_query=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get platform breakdown: {str(e)}")


@router.get(
    "/breakdowns/country",
    response_model=List[CountryBreakdown],
    summary="Get country breakdown",
    description="Returns metrics broken down by country"
)
def get_country_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    top_n: int = Query(10, ge=1, le=100, description="Number of top countries to return"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
    db: Session = Depends(get_db)
):
    """
    Get country performance breakdown.

    Returns metrics aggregated by country.
    """
    try:
        service = MetricsService(db)
        return service.get_country_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            top_n=top_n,
            campaign_status=status,
            search_query=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get country breakdown: {str(e)}")


@router.get(
    "/breakdowns/adset",
    response_model=List[AdsetBreakdown],
    summary="Get adset breakdown",
    description="Returns metrics broken down by adset"
)
def get_adset_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[int] = Query(None, description="Filter by specific campaign"),
    status: Optional[List[str]] = Query(None, description="Filter by campaign status"),
    search: Optional[str] = Query(None, description="Search by campaign name"),
    db: Session = Depends(get_db)
):
    """
    Get adset performance breakdown.

    Returns metrics aggregated by adset.
    """
    try:
        service = MetricsService(db)
        return service.get_adset_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            campaign_status=status,
            search_query=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get adset breakdown: {str(e)}")


@router.get(
    "/creatives",
    response_model=List[CreativeMetrics],
    summary="Get creative performance metrics",
    description="Returns metrics for all creatives with optional video filtering"
)
def get_creatives(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    is_video: Optional[bool] = Query(None, description="Filter by video/image creatives"),
    min_spend: float = Query(100, ge=0, description="Minimum spend threshold"),
    sort_by: str = Query("spend", description="Metric to sort by"),
    db: Session = Depends(get_db)
):
    """
    Get creative-level performance metrics.

    Returns all creatives with their metrics, including video-specific metrics
    (hook rate, completion rate) for video creatives.
    """
    try:
        service = MetricsService(db)
        return service.get_creative_metrics(
            start_date=start_date,
            end_date=end_date,
            is_video=is_video,
            min_spend=min_spend,
            sort_by=sort_by
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get creative metrics: {str(e)}")
