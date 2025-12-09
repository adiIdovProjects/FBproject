# data_api/api.py

"""
API.PY
 
Purpose: Defines the FastAPI application and the RESTful endpoints for the 
dashboard. It serves as the primary gateway, handling incoming HTTP requests 
from the React frontend, calling the relevant analytics functions, and returning 
the data as JSON.

Functions:
- get_core_summary_report: Primary endpoint for fetching daily core metrics (for graphs/KPIs).
- get_age_gender_breakdown: Endpoint for age/gender breakdown.
- get_country_breakdown: Endpoint for country breakdown.
- get_placement_breakdown: Endpoint for placement breakdown.

How to Use:
Run the application using Uvicorn: uvicorn data_api.api:app --reload
The API is accessible via GET requests (e.g., http://127.0.0.1:8000/api/reports/core_summary/).
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from typing import Optional, List, Dict, Any
import logging
import pandas as pd # Used for the df.to_dict conversion

# Import analytics functions (these will query the Star Schema database)
from .analytics import (
    fetch_core_metrics_summary,
    fetch_age_gender_breakdown,
    fetch_country_breakdown,
    fetch_placement_breakdown
)

logger = logging.getLogger(__name__)

# --- FastAPI Initialization ---
app = FastAPI(
    title="Marketing Data Warehouse API",
    description="A fast API for serving analytical reports from a Star Schema.",
    version="1.0.0"
)

# --- CORS Configuration ---
# CRITICAL: Required to allow the Frontend (React, usually on port 3000) to access the API (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Helper function to convert DataFrame output to JSON response format
def df_to_json_response(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Converts a Pandas DataFrame to a list of dictionaries (JSON records)."""
    if df.empty:
        return []
    return df.to_dict(orient='records')


@app.get("/api/reports/core_summary/", summary="Core Metrics Summary (Daily Aggregation)")
def get_core_summary_report(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns core metrics broken down daily (used by graphs and KPIs).
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
    
    df = fetch_core_metrics_summary(
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        campaign_name=campaign_name
    )
    
    return df_to_json_response(df)


@app.get("/api/reports/age_gender_breakdown/", summary="Breakdown by Age and Gender")
def get_age_gender_breakdown(
    start_date: Optional[date] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End Date (YYYY-MM-DD)"),
    campaign_name: Optional[str] = Query(None, description="Filter by specific campaign name"),
) -> List[Dict[str, Any]]:
    """
    Returns metrics broken down by Age Group and Gender.
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