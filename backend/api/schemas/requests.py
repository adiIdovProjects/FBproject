"""
Pydantic request models for API endpoints.

These models define the structure and validation rules for incoming API requests.
"""

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class CampaignStatus(str, Enum):
    """Campaign status filter options"""
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ALL = "ALL"


class Granularity(str, Enum):
    """Time series granularity options"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class SortDirection(str, Enum):
    """Sort direction options"""
    ASC = "asc"
    DESC = "desc"


class MetricsOverviewRequest(BaseModel):
    """Request parameters for metrics overview endpoint"""
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    compare_to_previous: bool = Field(False, description="Include previous period comparison")
    campaign_status: CampaignStatus = Field(CampaignStatus.ALL, description="Filter by campaign status")


class CampaignBreakdownRequest(BaseModel):
    """Request parameters for campaign breakdown endpoint"""
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    status: Optional[List[CampaignStatus]] = Field(None, description="Filter by campaign status")
    sort_by: str = Field("spend", description="Metric to sort by (spend, roas, ctr, etc.)")
    sort_direction: SortDirection = Field(SortDirection.DESC, description="Sort direction")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of results")


class TimeSeriesRequest(BaseModel):
    """Request parameters for time series trend endpoint"""
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    granularity: Granularity = Field(Granularity.DAY, description="Time aggregation level")
    metrics: List[str] = Field(
        ["spend", "clicks"],
        description="Metrics to include (spend, clicks, impressions, ctr, etc.)"
    )
    campaign_id: Optional[int] = Field(None, description="Filter by specific campaign")


class BreakdownRequest(BaseModel):
    """Request parameters for demographic/placement breakdowns"""
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    campaign_id: Optional[int] = Field(None, description="Filter by specific campaign")
    metric_to_optimize: str = Field("spend", description="Primary metric for analysis")


class CreativeOverviewRequest(BaseModel):
    """Request parameters for creative overview endpoint"""
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    is_video: Optional[bool] = Field(None, description="Filter by video/image creatives")
    min_spend: float = Field(100, ge=0, description="Minimum spend threshold")
    sort_by: str = Field("spend", description="Metric to sort by")
    sort_direction: SortDirection = Field(SortDirection.DESC, description="Sort direction")


class CreativeComparisonRequest(BaseModel):
    """Request parameters for creative comparison endpoint"""
    creative_ids: List[int] = Field(..., min_length=2, max_length=5, description="2-5 creative IDs to compare")
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    metrics: List[str] = Field(
        ["spend", "roas", "hook_rate"],
        description="Metrics to compare"
    )


class AIQueryRequest(BaseModel):
    """Request parameters for AI natural language query"""
    question: str = Field(..., min_length=5, max_length=500, description="Natural language question")
    context: Optional[dict] = Field(None, description="Additional context for the query")


class DataType(str, Enum):
    """Data types available for export"""
    CORE_METRICS = "core_metrics"
    CAMPAIGN_BREAKDOWN = "campaign_breakdown"
    AGE_GENDER = "age_gender"
    PLACEMENT = "placement"
    COUNTRY = "country"
    CREATIVE_METRICS = "creative_metrics"


class ExportFormat(str, Enum):
    """Export format options"""
    GOOGLE_SHEETS = "google_sheets"
    EXCEL = "excel"


class GoogleSheetsExportRequest(BaseModel):
    """Request parameters for Google Sheets export"""
    data_type: DataType = Field(..., description="Type of data to export")
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    spreadsheet_id: Optional[str] = Field(None, description="Existing spreadsheet ID (creates new if not provided)")
    sheet_name: str = Field("Facebook Ads Data", description="Name of the sheet tab")
    title: str = Field("Facebook Ads Analytics Export", description="Spreadsheet title (for new spreadsheets)")
    filters: Optional[dict] = Field(None, description="Additional filters (campaign_id, status, etc.)")


class ExcelExportRequest(BaseModel):
    """Request parameters for Excel export"""
    data_type: DataType = Field(..., description="Type of data to export")
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    filename: str = Field("facebook_ads_export.xlsx", description="Excel filename")
    sheet_name: str = Field("Data", description="Name of the Excel sheet")
    filters: Optional[dict] = Field(None, description="Additional filters (campaign_id, status, etc.)")
