"""
Export API router.

This module defines FastAPI endpoints for exporting data to Google Sheets and Excel.
"""

import os
from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session


import logging
from backend.api.dependencies import get_db, get_current_user
from backend.api.services.metrics_service import MetricsService
from backend.api.services.export_service import ExportService
from backend.api.schemas.requests import GoogleSheetsExportRequest, ExcelExportRequest, DataType
from backend.api.schemas.responses import GoogleSheetsExportResponse, ExcelExportResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/export", 
    tags=["export"],
    dependencies=[Depends(get_current_user)]
)


def _get_data_for_export(
    db: Session,
    user_id: int,
    data_type: DataType,
    start_date: date,
    end_date: date,
    filters: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Fetch data from database based on data type.

    Args:
        db: Database session
        user_id: Current user ID for filtering
        data_type: Type of data to export
        start_date: Start date
        end_date: End date
        filters: Additional filters

    Returns:
        List of dictionaries containing the data
    """
    service = MetricsService(db, user_id)
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
    current_user=Depends(get_current_user),
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
            user_id=current_user.id,
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

        # Check for Google credentials
        google_token = current_user.google_access_token
        google_refresh_token = current_user.google_refresh_token
        if not google_token:
            raise HTTPException(
                status_code=403,
                detail="Google account not connected. Please connect your Google account in settings."
            )

        # Initialize export service
        export_service = ExportService()

        # Export to Google Sheets
        spreadsheet_url = export_service.export_to_google_sheets(
            data=data,
            spreadsheet_id=request.spreadsheet_id,
            sheet_name=request.sheet_name,
            title=request.title,
            access_token=google_token,
            refresh_token=google_refresh_token,
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
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
    current_user=Depends(get_current_user),
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
            user_id=current_user.id,
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


@router.post(
    "/excel-generic",
    summary="Generic Excel Export",
    description="Exports raw data directly to an Excel file (.xlsx)"
)
def export_to_excel_generic(
    request_data: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export raw data to Excel file.
    Accepted nested data structures and converts them to Excel rows.
    """
    try:
        import traceback
        data = request_data.get("data")
        filename = request_data.get("filename", "export.xlsx")
        sheet_name = request_data.get("sheet_name", "Data")

        if not data:
            raise HTTPException(status_code=400, detail="No data provided for export")

        # Initialize export service
        export_service = ExportService()

        # Export to Excel (returns BytesIO)
        excel_file = export_service.export_to_excel(
            data=data,
            filename=filename,
            sheet_name=sheet_name
        )

        logger.info(f"Successfully exported {len(data)} rows to generic Excel: {filename}")

        # Return as downloadable file
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Failed to export generic data to Excel: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}\n{error_detail}")
@router.post(
    "/google-sheets-generic",
    response_model=GoogleSheetsExportResponse,
    summary="Generic Google Sheets Export",
    description="Exports raw data directly to a Google Sheet"
)
def export_to_google_sheets_generic(
    request_data: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export raw data to Google Sheets.
    Accepted nested data structures and converts them to sheet rows.
    """
    try:
        data = request_data.get("data")
        logger.info(f"Received export request. Keys received: {list(request_data.keys())}")
        if data:
            logger.info(f"Data type: {type(data)}, Length: {len(data) if isinstance(data, list) else 'N/A'}")
            if isinstance(data, list) and len(data) > 0:
                logger.info(f"Sample row keys: {data[0].keys()}")
        
        if not data:
            logger.error("No data provided in request")
            raise HTTPException(status_code=400, detail="No data provided")
        
        title = request_data.get("title", "Facebook Ads Analytics Export")
        sheet_name = request_data.get("sheet_name", "Facebook Ads Data")

        # Check for Google credentials
        google_token = current_user.google_access_token
        google_refresh_token = current_user.google_refresh_token
        
        if not google_token:
            logger.error("User missing Google access token")
            raise HTTPException(
                status_code=403,
                detail="Google account not connected. Please connect your Google account in settings."
            )

        # Initialize export service
        export_service = ExportService()

        # Export to Google Sheets
        spreadsheet_url = export_service.export_to_google_sheets(
            data=data,
            title=title,
            sheet_name=sheet_name,
            access_token=google_token,
            refresh_token=google_refresh_token,
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
        )

        # Extract spreadsheet ID from URL if not available in service
        ss_id = export_service.spreadsheet_id if hasattr(export_service, 'spreadsheet_id') else None
        if not ss_id and "docs.google.com/spreadsheets/d/" in spreadsheet_url:
            ss_id = spreadsheet_url.split("/d/")[1].split("/")[0]

        return GoogleSheetsExportResponse(
            spreadsheet_url=spreadsheet_url,
            spreadsheet_id=ss_id or "unknown",
            sheet_name=sheet_name,
            rows_exported=len(data)
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"❌ Generic Google Sheets Export Failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
