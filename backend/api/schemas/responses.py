"""
Pydantic response models for API endpoints.

These models define the structure of API responses with automatic validation
and documentation.
"""

from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MetricsPeriod(BaseModel):
    """Metrics for a single time period"""
    spend: float = Field(..., description="Total spend")
    impressions: int = Field(..., description="Total impressions")
    clicks: int = Field(..., description="Total clicks")
    ctr: float = Field(..., description="Click-through rate (%)")
    cpc: float = Field(..., description="Cost per click")
    cpm: float = Field(..., description="Cost per 1000 impressions")
    conversions: int = Field(0, description="Total conversions (all types)")
    conversion_value: float = Field(0.0, description="Total conversion value (all types)")
    purchases: int = Field(0, description="Total purchase events")
    purchase_value: float = Field(0.0, description="Total purchase value")
    roas: Optional[float] = Field(None, description="Return on ad spend (Purchase Value / Spend)")
    cpa: float = Field(0.0, description="Cost per acquisition (Spend / Purchases)")
    conversion_rate: float = Field(0.0, description="Conversion Rate (Conversions / Clicks * 100)")


class ChangePercentage(BaseModel):
    """Percentage change between periods"""
    spend: Optional[float] = None
    impressions: Optional[float] = None
    clicks: Optional[float] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    conversions: Optional[float] = None
    conversion_value: Optional[float] = None
    roas: Optional[float] = None
    cpa: Optional[float] = None
    conversion_rate: Optional[float] = None


class MetricsOverviewResponse(BaseModel):
    """Response for metrics overview endpoint"""
    current_period: MetricsPeriod
    previous_period: Optional[MetricsPeriod] = None
    change_percentage: Optional[ChangePercentage] = None
    currency: str = Field(default="USD", description="Account currency code (e.g., USD, EUR, ILS)")


class CampaignMetrics(BaseModel):
    """Metrics for a single campaign"""
    campaign_id: int
    campaign_name: str
    campaign_status: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float
    cpm: float
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0


class CampaignComparisonMetrics(CampaignMetrics):
    """Campaign metrics with side-by-side period comparison"""
    # Previous period values
    previous_spend: Optional[float] = None
    previous_conversions: Optional[int] = None
    previous_conversion_value: Optional[float] = None
    previous_roas: Optional[float] = None
    previous_cpa: Optional[float] = None
    previous_clicks: Optional[int] = None
    previous_impressions: Optional[int] = None
    previous_ctr: Optional[float] = None
    previous_cpc: Optional[float] = None

    # Percentage changes
    spend_change_pct: Optional[float] = None
    conversions_change_pct: Optional[float] = None
    roas_change_pct: Optional[float] = None
    cpa_change_pct: Optional[float] = None
    ctr_change_pct: Optional[float] = None
    cpc_change_pct: Optional[float] = None


class TimeSeriesDataPoint(BaseModel):
    """Single data point in a time series"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    spend: Optional[float] = None
    clicks: Optional[int] = None
    impressions: Optional[int] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    conversions: Optional[int] = None
    roas: Optional[float] = None


class AgeGenderBreakdown(BaseModel):
    """Demographic breakdown metrics"""
    age_group: str
    gender: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float
    cpm: float = 0.0
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0


class PlacementBreakdown(BaseModel):
    """Placement breakdown metrics"""
    placement_name: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float
    cpm: float = 0.0
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0
class AdsetBreakdown(BaseModel):
    """Adset breakdown metrics with targeting info"""
    adset_id: int
    adset_name: str
    adset_status: str = "ACTIVE"
    targeting_type: str
    targeting_summary: str
    spend: float
    clicks: int
    impressions: int
    ctr: float
    cpc: float
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0


class CountryBreakdown(BaseModel):
    """Country breakdown metrics"""
    country: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float = 0.0
    cpm: float = 0.0
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0


class EntityPlacementBreakdown(BaseModel):
    """Placement breakdown grouped by entity (campaign/adset/ad)"""
    entity_name: str
    placement_name: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float = 0.0


class EntityPlatformBreakdown(BaseModel):
    """Platform breakdown grouped by entity (campaign/adset/ad)"""
    entity_name: str
    platform: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float = 0.0


class EntityDemographicsBreakdown(BaseModel):
    """Demographics breakdown grouped by entity (campaign/adset/ad)"""
    entity_name: str
    age_group: str
    gender: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float = 0.0


class EntityCountryBreakdown(BaseModel):
    """Country breakdown grouped by entity (campaign/adset/ad)"""
    entity_name: str
    country: str
    spend: float
    impressions: int
    clicks: int
    ctr: float
    cpc: float = 0.0


class CreativeMetrics(BaseModel):
    """Metrics for a single creative"""
    creative_id: int
    title: Optional[str] = None
    body: Optional[str] = None
    is_video: bool
    is_carousel: bool = False
    video_length_seconds: Optional[int] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    spend: float
    impressions: int
    clicks: int
    ctr: float
    video_plays: Optional[int] = None
    hook_rate: Optional[float] = None
    completion_rate: Optional[float] = None
    hold_rate: Optional[float] = None
    avg_watch_time: Optional[float] = None
    conversions: int = 0
    conversion_value: float = 0.0
    purchases: int = 0
    purchase_value: float = 0.0
    roas: Optional[float] = None
    cpa: float = 0.0
    # Status fields
    ad_status: Optional[str] = None
    adset_status: Optional[str] = None
    campaign_status: Optional[str] = None
    effective_status: str
    # Fatigue detection fields
    fatigue_severity: Optional[str] = None  # "none" | "low" | "medium" | "high"
    ctr_decline_pct: Optional[float] = None
    days_active: Optional[int] = None


class CreativeComparisonMetrics(CreativeMetrics):
    """Creative metrics with side-by-side period comparison"""
    # Previous period values
    previous_spend: Optional[float] = None
    previous_clicks: Optional[int] = None
    previous_impressions: Optional[int] = None
    previous_conversions: Optional[int] = None
    previous_ctr: Optional[float] = None
    previous_cpc: Optional[float] = None
    previous_cpa: Optional[float] = None

    # Percentage changes
    spend_change_pct: Optional[float] = None
    clicks_change_pct: Optional[float] = None
    conversions_change_pct: Optional[float] = None
    ctr_change_pct: Optional[float] = None
    cpc_change_pct: Optional[float] = None
    cpa_change_pct: Optional[float] = None


class CreativeDetailResponse(BaseModel):
    """Detailed response for a single creative"""
    creative_id: int
    title: Optional[str] = None
    body: Optional[str] = None
    is_video: bool
    is_carousel: bool = False
    video_length_seconds: Optional[int] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    metrics: MetricsPeriod
    video_metrics: Optional[Dict[str, float]] = None
    trend: List[TimeSeriesDataPoint]


class CreativeComparisonMetric(BaseModel):
    """Single metric comparison across creatives"""
    metric_name: str
    values: Dict[int, float] = Field(..., description="creative_id -> value")
    winner_id: Optional[int] = None


class CreativeComparisonResponse(BaseModel):
    """Response for creative comparison endpoint"""
    creative_ids: List[int]
    comparisons: List[CreativeComparisonMetric]


class VideoInsight(BaseModel):
    """Single video insight/pattern"""
    message: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    supporting_data: Optional[Dict[str, Any]] = None


class VideoInsightsResponse(BaseModel):
    """Response for video insights endpoint"""
    average_hook_rate: float
    average_completion_rate: float
    average_hold_rate: float
    average_video_time: float
    best_performing_length: str
    insights: List[VideoInsight]
    top_videos: List[CreativeMetrics]


class AIInsight(BaseModel):
    """AI-generated insight"""
    type: str = Field(..., description="opportunity, warning, or trend")
    message: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    supporting_data: Optional[Dict[str, Any]] = None


class ChartConfig(BaseModel):
    """Chart configuration for AI query results"""
    type: str = Field(..., description="bar, line, pie, etc.")
    x_axis: str
    y_axis: str


class AIQueryResponse(BaseModel):
    """Response for AI natural language query"""
    answer: str
    data: Optional[List[Dict[str, Any]]] = None
    chart_config: Optional[ChartConfig] = None
    sql_query: Optional[str] = Field(None, description="Generated SQL for transparency")


class AIInsightsResponse(BaseModel):
    """Response for AI-generated insights"""
    insights: List[AIInsight]
    recommendations: List[str]


class DimensionItem(BaseModel):
    """Single dimension item (for dropdowns)"""
    id: int
    name: str
    status: Optional[str] = None


class GoogleSheetsExportResponse(BaseModel):
    """Response for Google Sheets export"""
    spreadsheet_url: str = Field(..., description="URL to the exported Google Sheet")
    spreadsheet_id: str = Field(..., description="Google Sheets spreadsheet ID")
    sheet_name: str = Field(..., description="Name of the sheet tab")
    rows_exported: int = Field(..., description="Number of data rows exported")


class ExcelExportResponse(BaseModel):
    """Response for Excel export"""
    filename: str = Field(..., description="Excel filename")
    rows_exported: int = Field(..., description="Number of data rows exported")
    download_url: Optional[str] = Field(None, description="Download URL if applicable")


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str
    error_code: Optional[str] = None
    status_code: int


# Insights Models
class InsightItem(BaseModel):
    """Single insight item"""
    type: str = Field(..., description="Insight type: opportunity, alert, trend, suggestion")
    icon: str = Field(..., description="Emoji icon for the insight")
    text: str = Field(..., description="Insight text content")
    priority: Optional[str] = Field(None, description="Priority level: high, medium, low")


class InsightsSummaryResponse(BaseModel):
    """Response for summary insights (mini cards)"""
    insights: List[InsightItem] = Field(..., description="List of 2-3 quick insights")
    generated_at: str = Field(..., description="ISO timestamp of when insights were generated")


class DeepInsightsResponse(BaseModel):
    """Response for deep analysis insights page"""
    executive_summary: str = Field(..., description="2-3 sentence executive summary")
    key_findings: List[InsightItem] = Field(..., description="3-5 key findings with metrics")
    performance_trends: List[InsightItem] = Field(..., description="3-5 performance trend insights")
    recommendations: List[InsightItem] = Field(..., description="Prioritized strategic recommendations")
    opportunities: List[InsightItem] = Field(..., description="2-3 opportunity detections with fixes")
    generated_at: str = Field(..., description="ISO timestamp of when analysis was generated")


class ComparisonItem(BaseModel):
    """Single item in comparison report (campaign or ad)"""
    id: str = Field(..., description="Campaign or Ad ID")
    name: str = Field(..., description="Campaign or Ad name")
    period1: MetricsPeriod = Field(..., description="Period 1 metrics")
    period2: MetricsPeriod = Field(..., description="Period 2 metrics")
    change_pct: ChangePercentage = Field(..., description="Percentage changes")
    change_abs: Dict[str, float] = Field(..., description="Absolute changes")
    # Multi-dimensional breakdown values (optional, for 2D/3D reports)
    primary_value: Optional[str] = Field(default=None, description="Primary breakdown value")
    secondary_value: Optional[str] = Field(default=None, description="Secondary breakdown value")
    tertiary_value: Optional[str] = Field(default=None, description="Tertiary breakdown value")



class ReportsComparisonResponse(BaseModel):
    """Response for reports comparison endpoint"""
    dimension: str = Field(..., description="Dimension level: overview, campaign, or ad")
    period1_start: str = Field(..., description="Period 1 start date (YYYY-MM-DD)")
    period1_end: str = Field(..., description="Period 1 end date (YYYY-MM-DD)")
    period2_start: Optional[str] = Field(None, description="Period 2 start date (YYYY-MM-DD) - optional if comparison disabled")
    period2_end: Optional[str] = Field(None, description="Period 2 end date (YYYY-MM-DD) - optional if comparison disabled")
    overview: Optional[ComparisonItem] = Field(None, description="Overview-level comparison (if dimension=overview)")
    items: List[ComparisonItem] = Field(default_factory=list, description="List of campaigns or ads (if dimension=campaign/ad)")
    currency: str = Field(default="USD", description="Account currency")


class AccountCollaboratorResponse(BaseModel):
    """Response for account collaborators list"""
    user_id: int = Field(..., description="User ID")
    full_name: Optional[str] = Field(None, description="User's full name")
    email: str = Field(..., description="User's email address")
    permission_level: str = Field(..., description="Permission level (admin or viewer)")

    class Config:
        from_attributes = True


class ComparisonMetric(BaseModel):
    """Single metric comparison across campaigns"""
    metric_name: str = Field(..., description="Name of the metric")
    values: dict[int, float] = Field(..., description="Campaign ID to value mapping")
    winner_id: Optional[int] = Field(None, description="ID of campaign with best value for this metric")


class CampaignComparisonResponse(BaseModel):
    """Response for campaign comparison"""
    campaign_ids: List[int] = Field(..., description="List of campaign IDs being compared")
    comparisons: List[ComparisonMetric] = Field(..., description="Metric comparisons")


class DayOfWeekBreakdown(BaseModel):
    """Performance breakdown by day of week"""
    day_of_week: str = Field(..., description="Day name (Monday, Tuesday, etc.)")
    spend: float = Field(0.0, description="Average daily spend")
    impressions: int = Field(0, description="Average daily impressions")
    clicks: int = Field(0, description="Average daily clicks")
    conversions: int = Field(0, description="Average daily conversions")
    ctr: float = Field(0.0, description="Average CTR (%)")
    cpc: float = Field(0.0, description="Average CPC")
    cpa: float = Field(0.0, description="Average CPA")
    roas: Optional[float] = Field(None, description="Average ROAS")


class AdsetComparisonMetrics(AdsetBreakdown):
    """Adset breakdown metrics with side-by-side period comparison"""
    # Previous period values
    previous_spend: Optional[float] = None
    previous_clicks: Optional[int] = None
    previous_impressions: Optional[int] = None
    previous_conversions: Optional[int] = None
    previous_ctr: Optional[float] = None
    previous_cpc: Optional[float] = None
    previous_cpa: Optional[float] = None

    # Percentage changes
    spend_change_pct: Optional[float] = None
    clicks_change_pct: Optional[float] = None
    conversions_change_pct: Optional[float] = None
    ctr_change_pct: Optional[float] = None
    cpc_change_pct: Optional[float] = None
    cpa_change_pct: Optional[float] = None
