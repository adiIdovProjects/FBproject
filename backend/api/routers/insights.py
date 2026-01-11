"""
Insights Router
Provides AI-powered insights and recommendations for marketing performance
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
import logging

logger = logging.getLogger(__name__)

from backend.api.dependencies import get_db, get_current_user
from backend.api.services.insights_service import InsightsService
from backend.api.services.historical_insights_service import HistoricalInsightsService
from backend.api.services.creative_insights_service import CreativeInsightsService
from backend.api.services.proactive_analysis_service import ProactiveAnalysisService

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
    account_id: Optional[str] = Query(None, description="Filter by specific ad account ID"),
    locale: str = Query("en", description="Locale for insight language (e.g., en, he, fr)"),
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
        service = InsightsService(db, current_user.id)
        return service.get_summary_insights(
            start_date,
            end_date,
            page_context,
            campaign_filter=campaign_filter,
            breakdown_type=breakdown_type,
            breakdown_group_by=breakdown_group_by,
            user_id=current_user.id,
            account_id=account_id,
            locale=locale
        )
    except Exception as e:
        import traceback
        print(f"DEBUG ERROR IN INSIGHTS: {e}")
        print(traceback.format_exc())
        logger.error(f"Failed to generate insights: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@router.get("/deep-analysis")
def get_deep_insights(
    start_date: date = Query(..., description="Start date for analysis"),
    end_date: date = Query(..., description="End date for analysis"),
    account_id: Optional[str] = Query(None, description="Filter by specific ad account ID"),
    locale: str = Query("en", description="Locale for insight language (e.g., en, he, fr)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get comprehensive deep analysis for dedicated insights page.
    Returns detailed executive summary, findings, trends, and recommendations.
    User-specific: Only analyzes accounts linked to the current user.
    """
    try:
        service = InsightsService(db, current_user.id)
        return service.get_deep_analysis(start_date, end_date, user_id=current_user.id, account_id=account_id, locale=locale)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate deep analysis: {str(e)}")


@router.get("/historical-analysis")
async def get_historical_analysis(
    lookback_days: int = Query(90, description="Number of days to analyze (30/60/90)", ge=7, le=365),
    campaign_id: Optional[int] = Query(None, description="Optional campaign ID filter"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get historical trend analysis with seasonality detection and predictive insights.
    Analyzes long-term performance patterns (30/60/90 days) and provides forecasts.

    Returns:
    - Weekly trend analysis with WoW changes
    - Day-of-week seasonality patterns
    - Trend metrics (direction, strength, volatility)
    - Early warning signals
    - Next week performance forecast
    - AI-generated strategic recommendations
    """
    try:
        service = HistoricalInsightsService(db, current_user.id)
        account_ids = service._get_user_account_ids()
        result = await service.analyze_historical_trends(
            lookback_days=lookback_days,
            campaign_id=campaign_id,
            account_ids=account_ids
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate historical analysis: {str(e)}")


@router.get("/campaign-deep-dive/{campaign_id}")
async def get_campaign_deep_dive(
    campaign_id: int,
    lookback_days: int = Query(90, description="Number of days to analyze", ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Deep dive analysis for a specific campaign over time.
    Tracks performance evolution, detects ad fatigue, and provides campaign-specific insights.

    Returns daily metrics with moving averages and AI analysis focused on this campaign.
    """
    try:
        service = HistoricalInsightsService(db, current_user.id)
        result = await service.get_campaign_deep_dive(
            campaign_id=campaign_id,
            lookback_days=lookback_days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate campaign analysis: {str(e)}")


@router.get("/creative-analysis")
async def get_creative_analysis(
    start_date: date = Query(..., description="Start date for analysis"),
    end_date: date = Query(..., description="End date for analysis"),
    campaign_id: Optional[int] = Query(None, description="Optional campaign ID filter"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Analyze creative performance patterns, themes, and CTA effectiveness.

    Returns:
    - Theme performance analysis (urgency, discount, social proof, etc.)
    - CTA effectiveness comparison
    - Creative fatigue alerts
    - Winning creative patterns
    - AI-generated creative strategy recommendations
    """
    try:
        service = CreativeInsightsService(db, current_user.id)
        account_ids = service._get_user_account_ids()
        result = await service.analyze_creative_patterns(
            start_date=start_date,
            end_date=end_date,
            campaign_id=campaign_id,
            account_ids=account_ids
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate creative analysis: {str(e)}")


@router.get("/creative-fatigue")
async def get_creative_fatigue_report(
    lookback_days: int = Query(30, description="Number of days to analyze", ge=7, le=90),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get focused ad fatigue report with refresh recommendations.

    Identifies creatives showing declining CTR over time and categorizes them by severity:
    - Critical: CTR declined >30% (urgent refresh needed)
    - Warning: CTR declined 20-30% (plan refresh soon)
    - Monitor: CTR declined 15-20% (watch closely)

    Returns actionable refresh recommendations prioritized by business impact.
    """
    try:
        service = CreativeInsightsService(db, current_user.id)
        result = await service.get_creative_fatigue_report(lookback_days=lookback_days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate fatigue report: {str(e)}")


@router.get("/latest")
def get_latest_insights(
    priority: Optional[str] = Query(None, description="Filter by priority: critical, warning, opportunity, info"),
    limit: int = Query(10, description="Number of insights to return", ge=1, le=50),
    unread_only: bool = Query(False, description="Only return unread insights"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get latest stored insights generated by the proactive analysis engine.

    The AI agent automatically generates daily (8 AM) and weekly (Monday 9 AM) insights.
    This endpoint retrieves stored insights from the database.

    Priority levels:
    - critical: Major performance drops (>30% decline)
    - warning: Significant issues (20-30% decline)
    - opportunity: Strong improvements (>20% increase)
    - info: General updates and trends

    Returns stored insights ordered by generation time (newest first).
    """
    try:
        service = ProactiveAnalysisService(db, current_user.id)
        insights = service.get_latest_insights(
            priority=priority,
            limit=limit,
            unread_only=unread_only,
            account_id=None
        )
        return {
            'insights': insights,
            'count': len(insights)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve insights: {str(e)}")


@router.patch("/insights/{insight_id}/read")
def mark_insight_as_read(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark a specific insight as read.

    This helps track which insights the user has already reviewed.
    """
    try:
        service = ProactiveAnalysisService(db, current_user.id)
        success = service.mark_as_read(insight_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Insight {insight_id} not found")

        return {'success': True, 'insight_id': insight_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark insight as read: {str(e)}")


@router.post("/generate-now")
def generate_insights_now(
    insight_type: str = Query(..., description="Type of insight to generate: daily or weekly"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually trigger insight generation (for testing or on-demand generation).

    insight_type: 'daily' or 'weekly'

    Note: Normally insights are auto-generated by the scheduler.
    """
    try:
        service = ProactiveAnalysisService(db, current_user.id)

        if insight_type == 'daily':
            insights = service.generate_daily_insights(account_id=None)
        elif insight_type == 'weekly':
            insights = service.generate_weekly_insights(account_id=None)
        else:
            raise HTTPException(status_code=400, detail="insight_type must be 'daily' or 'weekly'")

        return {
            'success': True,
            'insight_type': insight_type,
            'insights_generated': len(insights),
            'insights': insights
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")
