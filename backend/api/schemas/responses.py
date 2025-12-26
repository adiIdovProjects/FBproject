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
    purchases: int = Field(0, description="Total purchases")
    purchase_value: float = Field(0.0, description="Total purchase value")
    roas: float = Field(0.0, description="Return on ad spend")
    cpa: float = Field(0.0, description="Cost per acquisition")


class ChangePercentage(BaseModel):
    """Percentage change between periods"""
    spend: Optional[float] = None
    impressions: Optional[float] = None
    clicks: Optional[float] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    purchases: Optional[float] = None
    purchase_value: Optional[float] = None
    roas: Optional[float] = None
    cpa: Optional[float] = None


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
    purchases: int = 0
    purchase_value: float = 0.0
    roas: float = 0.0
    cpa: float = 0.0


class CampaignComparisonMetrics(CampaignMetrics):
    """Campaign metrics with side-by-side period comparison"""
    # Previous period values
    previous_spend: Optional[float] = None
    previous_purchases: Optional[int] = None
    previous_roas: Optional[float] = None
    previous_cpa: Optional[float] = None

    # Percentage changes
    spend_change_pct: Optional[float] = None
    purchases_change_pct: Optional[float] = None
    roas_change_pct: Optional[float] = None
    cpa_change_pct: Optional[float] = None


class TimeSeriesDataPoint(BaseModel):
    """Single data point in a time series"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    spend: Optional[float] = None
    clicks: Optional[int] = None
    impressions: Optional[int] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    purchases: Optional[int] = None
    roas: Optional[float] = None


class AgeGenderBreakdown(BaseModel):
    """Demographic breakdown metrics"""
    age_group: str
    gender: str
    spend: float
    clicks: int
    impressions: int
    ctr: float
    cpc: float
    purchases: int = 0
    roas: float = 0.0


class PlacementBreakdown(BaseModel):
    """Placement breakdown metrics"""
    placement_name: str
    spend: float
    clicks: int
    impressions: int
    ctr: float
    cpc: float
    purchases: int = 0
    roas: float = 0.0
class AdsetBreakdown(BaseModel):
    """Adset breakdown metrics with targeting info"""
    adset_id: int
    adset_name: str
    targeting_type: str
    targeting_summary: str
    spend: float
    clicks: int
    impressions: int
    ctr: float
    cpc: float
    purchases: int = 0
    roas: float = 0.0
    cpa: float = 0.0


class CountryBreakdown(BaseModel):
    """Country breakdown metrics"""
    country: str
    spend: float
    clicks: int
    impressions: int
    ctr: float
    purchases: int = 0
    roas: float = 0.0


class CreativeMetrics(BaseModel):
    """Metrics for a single creative"""
    creative_id: int
    title: Optional[str] = None
    body: Optional[str] = None
    is_video: bool
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
    purchases: int = 0
    roas: float = 0.0
    cpa: float = 0.0


class CreativeDetailResponse(BaseModel):
    """Detailed response for a single creative"""
    creative_id: int
    title: Optional[str] = None
    body: Optional[str] = None
    is_video: bool
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
