"""
Creatives API router.

This module defines FastAPI endpoints for creative analysis.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from api.dependencies import get_db, get_current_user
from api.services.metrics_service import MetricsService
from api.schemas.responses import (
    CreativeMetrics,
    CreativeDetailResponse,
    CreativeComparisonResponse,
    VideoInsightsResponse
)


router = APIRouter(
    prefix="/api/v1/creatives", 
    tags=["creatives"],
    dependencies=[Depends(get_current_user)]
)


class CreativeComparisonRequest(BaseModel):
    """Request body for creative comparison"""
    creative_ids: List[int] = Field(..., min_length=2, max_length=5)
    start_date: date
    end_date: date
    metrics: Optional[List[str]] = None


@router.get(
    "",
    response_model=List[CreativeMetrics],
    summary="Get creative performance metrics",
    description="Returns metrics for all creatives with optional video filtering"
)
def get_creatives(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    is_video: Optional[bool] = Query(None, description="Filter by video/image creatives"),
    min_spend: float = Query(0, ge=0, description="Minimum spend threshold"),
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


@router.get(
    "/{creative_id}",
    response_model=CreativeDetailResponse,
    summary="Get detailed creative metrics",
    description="Returns detailed metrics for a single creative with trend data"
)
def get_creative_detail(
    creative_id: int,
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get detailed metrics for a single creative.

    Returns aggregated metrics, video metrics (if applicable), and daily trend data.
    """
    try:
        service = MetricsService(db)
        result = service.get_creative_detail(
            creative_id=creative_id,
            start_date=start_date,
            end_date=end_date
        )

        if not result:
            raise HTTPException(status_code=404, detail=f"Creative {creative_id} not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get creative detail: {str(e)}")


@router.post(
    "/compare",
    response_model=CreativeComparisonResponse,
    summary="Compare multiple creatives",
    description="Compare 2-5 creatives side-by-side"
)
def compare_creatives(
    request: CreativeComparisonRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Compare multiple creatives side-by-side.

    Accepts 2-5 creative IDs and returns comparison data showing which creative
    performs best for each metric.
    """
    try:
        if len(request.creative_ids) < 2:
            raise HTTPException(status_code=400, detail="Must provide at least 2 creative IDs")
        if len(request.creative_ids) > 5:
            raise HTTPException(status_code=400, detail="Cannot compare more than 5 creatives")

        service = MetricsService(db)
        result = service.get_creative_comparison(
            creative_ids=request.creative_ids,
            start_date=request.start_date,
            end_date=request.end_date,
            metrics=request.metrics
        )

        if not result:
            raise HTTPException(status_code=404, detail="No data found for the provided creative IDs")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare creatives: {str(e)}")


@router.get(
    "/insights/video",
    response_model=VideoInsightsResponse,
    summary="Get video performance insights",
    description="Returns insights and patterns for video creative performance"
)
def get_video_insights(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get video performance insights.

    Returns average video metrics, top performing videos, and AI-generated insights
    about video performance patterns.
    """
    try:
        service = MetricsService(db)
        return service.get_video_insights(
            start_date=start_date,
            end_date=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get video insights: {str(e)}")
