"""
Export API router.

This module defines FastAPI endpoints for exporting data to Google Sheets and Excel.
"""

from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import sys
import os
import logging

# Add paths for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from api.dependencies import get_db
from api.services.metrics_service import MetricsService
from api.services.export_service import ExportService
from api.schemas.requests import GoogleSheetsExportRequest, ExcelExportRequest, DataType
from api.schemas.responses import GoogleSheetsExportResponse, ExcelExportResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/export", tags=["export"])


def _get_data_for_export(
    db: Session,
    data_type: DataType,
    start_date: date,
    end_date: date,
    filters: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Fetch data from database based on data type.

    Args:
        db: Database session
        data_type: Type of data to export
        start_date: Start date
        end_date: End date
        filters: Additional filters

    Returns:
        List of dictionaries containing the data
    """
    service = MetricsService(db)
    filters = filters or {}

    if data_type == DataType.CORE_METRICS:
        # Get overview metrics
        result = service.get_overview_metrics(
            start_date=start_date,
            end_date=end_date,
            compare_to_previous=False
        )
        return [{
            "metric": "Overall Performance",
            "spend": result.current_period.spend,
            "impressions": result.current_period.impressions,
            "clicks": result.current_period.clicks,
            "ctr": result.current_period.ctr,
            "cpc": result.current_period.cpc,
            "cpm": result.current_period.cpm,
            "purchases": result.current_period.purchases,
            "purchase_value": result.current_period.purchase_value,
            "roas": result.current_period.roas,
            "cpa": result.current_period.cpa
        }]

    elif data_type == DataType.CAMPAIGN_BREAKDOWN:
        # Get campaign breakdown
        campaigns = service.get_campaign_breakdown(
            start_date=start_date,
            end_date=end_date,
            sort_by=filters.get("sort_by", "spend"),
            limit=filters.get("limit", 100)
        )
        return [campaign.model_dump() for campaign in campaigns]

    elif data_type == DataType.AGE_GENDER:
        # Get age/gender breakdown
        breakdown = service.get_age_gender_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=filters.get("campaign_id")
        )
        return [item.model_dump() for item in breakdown]

    elif data_type == DataType.PLACEMENT:
        # Get placement breakdown
        breakdown = service.get_placement_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=filters.get("campaign_id")
        )
        return [item.model_dump() for item in breakdown]

    elif data_type == DataType.COUNTRY:
        # Get country breakdown
        breakdown = service.get_country_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_id=filters.get("campaign_id"),
            top_n=filters.get("top_n", 10)
        )
        return [item.model_dump() for item in breakdown]

    elif data_type == DataType.CREATIVE_METRICS:
        # Get creative metrics
        creatives = service.get_creative_metrics(
            start_date=start_date,
            end_date=end_date,
            is_video=filters.get("is_video"),
            min_spend=filters.get("min_spend", 100),
            sort_by=filters.get("sort_by", "spend")
        )
        return [creative.model_dump() for creative in creatives]

    else:
        raise ValueError(f"Unknown data type: {data_type}")


@router.post(
    "/google-sheets",
    response_model=GoogleSheetsExportResponse,
    summary="Export data to Google Sheets",
    description="Exports analytics data to a Google Sheet with formatting"
)
def export_to_google_sheets(
    request: GoogleSheetsExportRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Export data to Google Sheets.

    Creates a new spreadsheet or updates an existing one with the requested data.
    Applies proper formatting (bold headers, currency/percentage formats, freeze row).

    Returns the shareable Google Sheets URL.
    """
    try:
        # Get data
        data = _get_data_for_export(
            db=db,
            data_type=request.data_type,
            start_date=request.start_date,
            end_date=request.end_date,
            filters=request.filters
        )

        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {request.data_type} in the specified date range"
            )

        # Initialize export service
        export_service = ExportService()

        # Export to Google Sheets
        spreadsheet_url = export_service.export_to_google_sheets(
            data=data,
            spreadsheet_id=request.spreadsheet_id,
            sheet_name=request.sheet_name,
            title=request.title
        )

        # Extract spreadsheet ID from URL
        spreadsheet_id = spreadsheet_url.split("/d/")[1].split("/")[0]

        logger.info(f"Successfully exported {len(data)} rows to Google Sheets: {spreadsheet_url}")

        return GoogleSheetsExportResponse(
            spreadsheet_url=spreadsheet_url,
            spreadsheet_id=spreadsheet_id,
            sheet_name=request.sheet_name,
            rows_exported=len(data)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export to Google Sheets: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post(
    "/excel",
    summary="Export data to Excel",
    description="Exports analytics data to an Excel file (.xlsx)"
)
def export_to_excel(
    request: ExcelExportRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Export data to Excel file.

    Generates an Excel file (.xlsx) with the requested data and returns it
    as a downloadable file.
    """
    try:
        # Get data
        data = _get_data_for_export(
            db=db,
            data_type=request.data_type,
            start_date=request.start_date,
            end_date=request.end_date,
            filters=request.filters
        )

        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {request.data_type} in the specified date range"
            )

        # Initialize export service
        export_service = ExportService()

        # Export to Excel (returns BytesIO)
        excel_file = export_service.export_to_excel(
            data=data,
            filename=request.filename,
            sheet_name=request.sheet_name
        )

        logger.info(f"Successfully exported {len(data)} rows to Excel: {request.filename}")

        # Return as downloadable file
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{request.filename}"'
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export to Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
