# data_api/api.py

"""
API.PY
 
Purpose: Defines the FastAPI application and the RESTful endpoints for the 
dashboard. It serves as the primary gateway, handling incoming HTTP requests 
from the React frontend, calling the relevant analytics functions, and returning 
the data as JSON.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from typing import Optional, List, Dict, Any
import logging
import pandas as pd 

# Import analytics functions (these will query the Star Schema database)
from .analytics import (
    fetch_core_metrics_summary,
    fetch_age_gender_breakdown,
    fetch_country_breakdown,
    fetch_placement_breakdown,
    fetch_creative_breakdown 
)

logger = logging.getLogger(__name__)

# --- FastAPI Initialization ---
app = FastAPI(
    title="Marketing Data Warehouse API",
    description="RESTful API for fetching aggregated marketing performance data from the Star Schema.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def df_to_json_response(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Helper function to convert a Pandas DataFrame to a FastAPI-friendly JSON list."""
    if df.empty:
        return []
    # Use 'records' format for a list of dictionaries (one dict per row)
    return df.to_dict(orient='records') 

# --- Health Check Endpoint (Recommended) ---
@app.get("/", summary="API Health Check")
def read_root():
    """Simple health check to ensure the API is running."""
    return {"message": "Marketing Analytics API is running successfully."}


# ----------------------------------------------------------------------
# --- 1. Core Summary Endpoint (Main KPI and Chart data) ---
# ----------------------------------------------------------------------

@app.get("/api/reports/core_summary/", summary="Core Daily Summary (KPIs & Chart)")
def get_core_summary_report(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
    # *** NEW QUERY PARAMETER FOR GRANULARITY ***
    granularity: Optional[str] = Query('day', description="Granularity: 'day', 'week', or 'month'")
) -> List[Dict[str, Any]]:
    """
    Returns aggregated metrics, including calculated KPIs (CTR, CPC, CPA), grouped by 
    the specified granularity (day, week, or month).
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        
    # *** VALIDATE GRANULARITY PARAMETER ***
    if granularity not in ['day', 'week', 'month']:
        raise HTTPException(status_code=400, detail="Invalid granularity. Must be 'day', 'week', or 'month'.")
        
    df = fetch_core_metrics_summary(
        # Convert date objects to ISO format strings for SQL querying
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name,
        # *** PASS NEW PARAMETER ***
        granularity=granularity
    )
    return df_to_json_response(df)


# ----------------------------------------------------------------------
# --- 2. Breakdown Endpoints ---
# (The rest of the endpoints remain the same)
# ----------------------------------------------------------------------

@app.get("/api/reports/age_gender_breakdown/", summary="Breakdown by Age and Gender")
def get_age_gender_breakdown(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns metrics broken down by Age Range and Gender.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

    df = fetch_age_gender_breakdown(
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name
    )
    return df_to_json_response(df)


@app.get("/api/reports/country_breakdown/", summary="Breakdown by Country")
def get_country_breakdown(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns metrics broken down by Country.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        
    df = fetch_country_breakdown(
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name
    )
    return df_to_json_response(df)


@app.get("/api/reports/placement_breakdown/", summary="Breakdown by Placement")
def get_placement_breakdown(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns metrics broken down by Placement.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        
    df = fetch_placement_breakdown(
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name
    )
    return df_to_json_response(df)

@app.get("/api/reports/creative_breakdown/", summary="Breakdown by Creative (NEW)")
def get_creative_breakdown(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns metrics broken down by Ad Creative Name and ID.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        
    df = fetch_creative_breakdown(
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name
    )
    return df_to_json_response(df)