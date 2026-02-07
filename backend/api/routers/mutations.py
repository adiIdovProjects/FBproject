from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from typing import Dict, Any, Optional

from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.adset_repository import AdSetRepository
from backend.api.repositories.ad_repository import AdRepository
from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.schemas.mutations import SmartCampaignRequest, AddCreativeRequest, StatusUpdateRequest, BudgetUpdateRequest, UpdateAdSetTargetingRequest, UpdateAdCreativeRequest, CreateLeadFormRequest, LeadsResponse, LeadRecord, CreateCustomAudienceRequest, CreatePageEngagementAudienceRequest, CreateLookalikeAudienceRequest, FunnelStagesResponse, UpdateFunnelStagesRequest, LeadStagesResponse, UpdateLeadStageRequest
from backend.models.user_schema import User
from backend.api.services.ad_mutation_service import AdMutationService

router = APIRouter(
    prefix="/api/mutations",
    tags=["mutations"],
    responses={404: {"description": "Not found"}},
)

def get_mutation_service(user: User = Depends(get_current_user)) -> AdMutationService:
    if not user.fb_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not connected to Facebook"
        )
    # Use decrypted token for API calls
    return AdMutationService(access_token=user.decrypted_fb_token)

# --- Dropdown Data Endpoints ---

@router.get("/campaigns-list")
def get_campaigns_list(
    account_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List active/paused campaigns for dropdown selection (from Local DB)."""
    repo = CampaignRepository(db)
    # Filter by account (handle string "act_123" or "123")
    clean_acc_id = account_id.replace("act_", "")
    
    # We fetch last 30 days to ensure we get recent campaigns, or just broad.
    # The breakdown repository requires dates. Let's use a wide range.
    campaigns = repo.get_campaign_breakdown(
        start_date=date.today() - timedelta(days=90),
        end_date=date.today(),
        campaign_status=['ACTIVE', 'PAUSED'],
        limit=200,
        account_ids=[clean_acc_id] # Pass as string, repository might expect int?
        # Repository expects List[int] usually. Let's check repository.
        # It expects Optional[List[int]]. I need to cast to int if possible or let repository handle it.
        # Postgres often handles string-to-int. But let's be safe.
    )
    # The repository logic builds `account_id IN (...)`.
    # Let's clean and try to parse int.
    try:
        acc_int = int(clean_acc_id)
        # Re-call with clean logic
        campaigns = repo.get_campaign_breakdown(
            start_date=date.today() - timedelta(days=90),
            end_date=date.today(),
            campaign_status=['ACTIVE', 'PAUSED'],
            limit=200,
            account_ids=[acc_int]
        )
    except ValueError:
        # If account_id is not integer (unlikely for FB), return empty or try string
        return []

    return [
        {"id": c['campaign_id'], "name": c['campaign_name'], "status": c['campaign_status']} 
        for c in campaigns
    ]

@router.get("/adsets-list")
def get_adsets_list(
    campaign_id: int,
    account_id: Optional[str] = Query(None, description="Filter by specific ad account ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List active/paused adsets for a campaign (from Local DB).
    Filters by user's accounts for data isolation."""
    repo = AdSetRepository(db)

    # Get account filter
    account_ids = None
    if account_id:
        account_ids = [int(account_id.replace("act_", ""))]
    else:
        # Get user's account IDs for filtering
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db)
        account_ids = user_repo.get_user_account_ids(user.id)

    adsets = repo.get_adset_breakdown(
        start_date=date.today() - timedelta(days=90),
        end_date=date.today(),
        campaign_id=campaign_id,
        campaign_status=['ACTIVE', 'PAUSED'],
        account_ids=account_ids
    )
    return [
        {"id": a['adset_id'], "name": a['adset_name']}
        for a in adsets
    ]

# --- Mutation Endpoints ---

@router.post("/add-creative", status_code=status.HTTP_201_CREATED)
def add_creative_to_campaign(
    request: AddCreativeRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """
    Add a new Creative + Ad to an existing AdSet.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} adding creative to adset {request.adset_id}")
        result = service.add_creative_to_adset(request)
        logger.info(f"User {user.id} successfully added creative {result.get('creative_id')}")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to add creative to adset {request.adset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/smart-campaign", status_code=status.HTTP_201_CREATED)
def create_smart_campaign(
    request: SmartCampaignRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """
    Create a new campaign with 'Smart Defaults'.
    Structure: Campaign -> AdSet -> Ad (All PAUSED).
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} creating campaign '{request.campaign_name}' for account {request.account_id}")
        result = service.create_smart_campaign(request)
        logger.info(f"User {user.id} successfully created campaign {result.get('campaign_id')}")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to create campaign for account {request.account_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/lead-forms")
def get_lead_forms(
    page_id: str,
    account_id: str = None,
    service: AdMutationService = Depends(get_mutation_service)
):
    """Get active lead forms for a specific page."""
    try:
        return service.get_lead_forms(page_id, account_id)
    except ValueError as e:
        # User-friendly errors (permissions, invalid page, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lead-forms/{form_id}")
def get_lead_form_details(
    form_id: str,
    page_id: str = Query(..., description="Facebook Page ID that owns the form"),
    account_id: str = Query(None, description="Ad account ID (optional)"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Get detailed configuration of a lead form for duplication."""
    try:
        return service.get_lead_form_details(form_id, page_id, account_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pages/{page_id}/whatsapp-status")
def check_whatsapp_status(
    page_id: str,
    service: AdMutationService = Depends(get_mutation_service)
):
    """Check if a Facebook Page has WhatsApp Business connected."""
    try:
        return service.check_whatsapp_connection(page_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leads", response_model=LeadsResponse)
def get_leads(
    lead_form_id: str = Query(..., description="Lead form ID to fetch leads from"),
    page_id: str = Query(..., description="Facebook Page ID that owns the form"),
    account_id: str = Query(None, description="Ad account ID (optional, helps get page token)"),
    start_date: date = Query(None, description="Filter leads from this date (YYYY-MM-DD)"),
    end_date: date = Query(None, description="Filter leads until this date inclusive (YYYY-MM-DD)"),
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Get leads submitted to a lead form. Returns flattened lead data."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} fetching leads for form {lead_form_id}")
        logger.info(f"Date params received: start_date={repr(start_date)} (type={type(start_date).__name__}), end_date={repr(end_date)} (type={type(end_date).__name__})")
        leads = service.get_leads(
            lead_form_id, page_id, account_id,
            start_date=str(start_date) if start_date else None,
            end_date=str(end_date) if end_date else None
        )
        logger.info(f"Found {len(leads)} leads for form {lead_form_id}")
        return LeadsResponse(
            leads=[LeadRecord(**lead) for lead in leads],
            total=len(leads)
        )
    except ValueError as e:
        logger.warning(f"User {user.id} failed to fetch leads: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to fetch leads: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leads/export")
def export_leads_csv(
    lead_form_id: str = Query(..., description="Lead form ID to export leads from"),
    page_id: str = Query(..., description="Facebook Page ID that owns the form"),
    account_id: str = Query(None, description="Ad account ID (optional)"),
    start_date: date = Query(None, description="Filter leads from this date (YYYY-MM-DD)"),
    end_date: date = Query(None, description="Filter leads until this date inclusive (YYYY-MM-DD)"),
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Export leads as CSV file download."""
    import logging
    import csv
    import io
    from fastapi.responses import StreamingResponse

    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} exporting leads CSV for form {lead_form_id}")
        logger.info(f"CSV export date params: start_date={repr(start_date)}, end_date={repr(end_date)}")
        leads = service.get_leads(
            lead_form_id, page_id, account_id,
            start_date=str(start_date) if start_date else None,
            end_date=str(end_date) if end_date else None
        )

        if not leads:
            raise HTTPException(status_code=404, detail="No leads found for this form")

        # Build CSV in memory with UTF-8 BOM for Excel Hebrew support
        output = io.StringIO()

        # Get all field names from leads (they may vary)
        all_fields = set()
        for lead in leads:
            all_fields.update(lead.keys())

        # Order fields: id, created_time first, then alphabetically
        priority_fields = ['id', 'created_time']
        other_fields = sorted([f for f in all_fields if f not in priority_fields])
        fieldnames = priority_fields + other_fields

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(leads)

        # Get CSV content and add UTF-8 BOM for Excel compatibility with Hebrew/Arabic
        csv_content = output.getvalue()
        # UTF-8 BOM: \ufeff (tells Excel to use UTF-8 encoding)
        csv_with_bom = '\ufeff' + csv_content
        # Encode to bytes for proper streaming
        csv_bytes = csv_with_bom.encode('utf-8')

        logger.info(f"Exported {len(leads)} leads to CSV for form {lead_form_id}")

        return StreamingResponse(
            iter([csv_bytes]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=leads_{lead_form_id}.csv"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User {user.id} failed to export leads: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lead-forms", status_code=status.HTTP_201_CREATED)
def create_lead_form(
    request: CreateLeadFormRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Create a new lead form for a Facebook page."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} creating lead form '{request.form_name}' for page {request.page_id}")

        # Convert custom questions to dict format
        custom_questions = None
        if request.custom_questions:
            custom_questions = [
                {'label': cq.label, 'field_type': cq.field_type, 'options': cq.options, 'allow_multiple': cq.allow_multiple}
                for cq in request.custom_questions
            ]

        result = service.create_lead_form(
            page_id=request.page_id,
            form_name=request.form_name,
            questions=request.questions,
            privacy_policy_url=request.privacy_policy_url,
            account_id=request.account_id,
            headline=request.headline,
            description=request.description,
            custom_questions=custom_questions,
            thank_you_title=request.thank_you_title,
            thank_you_body=request.thank_you_body,
            thank_you_button_text=request.thank_you_button_text,
            thank_you_url=request.thank_you_url
        )
        logger.info(f"User {user.id} successfully created lead form {result.get('id')}")
        return result
    except ValueError as e:
        logger.warning(f"User {user.id} failed to create lead form: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to create lead form: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pixels")
def get_pixels(
    account_id: str,
    service: AdMutationService = Depends(get_mutation_service)
):
    """Get Facebook Pixels for an ad account."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"Fetching pixels for account {account_id}")
        result = service.get_pixels(account_id)
        logger.info(f"Found {len(result)} pixels for account {account_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to fetch pixels for account {account_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/custom-audiences")
def get_custom_audiences(
    account_id: str,
    service: AdMutationService = Depends(get_mutation_service)
):
    """Get Custom Audiences (lookalikes, saved audiences) for an ad account."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"Fetching custom audiences for account {account_id}")
        result = service.get_custom_audiences(account_id)
        logger.info(f"Found {len(result)} custom audiences for account {account_id}")
        return result
    except Exception as e:
        logger.error(f"Failed to fetch custom audiences for account {account_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-audiences", status_code=status.HTTP_201_CREATED)
def create_custom_audience(
    request: CreateCustomAudienceRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Create a custom audience from pixel data (website visitors)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} creating custom audience '{request.name}' from pixel {request.pixel_id}")
        result = service.create_custom_audience_from_pixel(
            account_id=request.account_id,
            name=request.name,
            pixel_id=request.pixel_id,
            event_type=request.event_type,
            retention_days=request.retention_days
        )
        logger.info(f"User {user.id} successfully created custom audience {result.get('id')}")
        return result
    except ValueError as e:
        logger.warning(f"User {user.id} failed to create custom audience: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to create custom audience: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/page-engagement-audiences", status_code=status.HTTP_201_CREATED)
def create_page_engagement_audience(
    request: CreatePageEngagementAudienceRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Create a custom audience from Facebook Page engagement."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} creating page engagement audience '{request.name}' from page {request.page_id}")
        result = service.create_page_engagement_audience(
            account_id=request.account_id,
            name=request.name,
            page_id=request.page_id,
            engagement_type=request.engagement_type,
            retention_days=request.retention_days
        )
        logger.info(f"User {user.id} successfully created page engagement audience {result.get('id')}")
        return result
    except ValueError as e:
        logger.warning(f"User {user.id} failed to create page engagement audience: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to create page engagement audience: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lookalike-audiences", status_code=status.HTTP_201_CREATED)
def create_lookalike_audience(
    request: CreateLookalikeAudienceRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Create a lookalike audience from an existing custom audience."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} creating lookalike audience '{request.name}' from source {request.source_audience_id}")
        result = service.create_lookalike_audience(
            account_id=request.account_id,
            name=request.name,
            source_audience_id=request.source_audience_id,
            country_code=request.country_code,
            ratio=request.ratio
        )
        logger.info(f"User {user.id} successfully created lookalike audience {result.get('id')}")
        return result
    except ValueError as e:
        logger.warning(f"User {user.id} failed to create lookalike audience: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to create lookalike audience: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/search")
def search_targeting_locations(
    q: str = Query(..., min_length=2, description="Search query for location"),
    location_types: str = Query("country,region,city", description="Comma-separated location types"),
    locale: str = Query(None, description="Locale for search (e.g., he_IL, ar_AR, de_DE, fr_FR)"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Search for targeting locations (countries, cities, regions) via Facebook API."""
    try:
        types_list = [t.strip() for t in location_types.split(",")]
        return service.search_targeting_locations(q, types_list, locale)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/interests")
def search_interests(
    q: str = Query(..., min_length=2, description="Search query for interests"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Search for interest targeting options via Facebook API."""
    try:
        return service.search_interests(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_media(
    account_id: str = Form(...),
    is_video: bool = Form(False),
    file: UploadFile = File(...),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Upload media (Image/Video) to Facebook Asset Library."""
    try:
        content = await file.read()
        return service.upload_media(
            account_id=account_id,
            file_content=content,
            filename=file.filename,
            is_video=is_video
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Status & Budget Update Endpoints ---

@router.patch("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: str,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Pause or activate a campaign (syncs to local DB immediately)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating campaign {campaign_id} status to {request.status}")
        result = service.update_campaign_status(campaign_id, request.status, db=db)
        logger.info(f"User {user.id} successfully updated campaign {campaign_id}")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update campaign {campaign_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/adsets/{adset_id}/status")
def update_adset_status(
    adset_id: str,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Pause or activate an ad set (syncs to local DB immediately)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating adset {adset_id} status to {request.status}")
        result = service.update_adset_status(adset_id, request.status, db=db)
        logger.info(f"User {user.id} successfully updated adset {adset_id}")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update adset {adset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/ads/{ad_id}/status")
def update_ad_status(
    ad_id: str,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Pause or activate an ad (syncs to local DB immediately)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating ad {ad_id} status to {request.status}")
        result = service.update_ad_status(ad_id, request.status, db=db)
        logger.info(f"User {user.id} successfully updated ad {ad_id}")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update ad {ad_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/adsets/{adset_id}/budget")
def update_adset_budget(
    adset_id: str,
    request: BudgetUpdateRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Update daily budget for an ad set (ABO campaigns, in cents)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating adset {adset_id} budget to {request.daily_budget_cents} cents")
        result = service.update_adset_budget(adset_id, request.daily_budget_cents)
        logger.info(f"User {user.id} successfully updated adset {adset_id} budget")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update adset {adset_id} budget: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/campaigns/{campaign_id}/budget")
def update_campaign_budget(
    campaign_id: str,
    request: BudgetUpdateRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Update daily budget for a campaign (CBO campaigns, in cents)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating campaign {campaign_id} budget to {request.daily_budget_cents} cents")
        result = service.update_campaign_budget(campaign_id, request.daily_budget_cents)
        logger.info(f"User {user.id} successfully updated campaign {campaign_id} budget")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update campaign {campaign_id} budget: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budgets/campaigns")
def get_campaign_budgets(
    campaign_ids: List[str],
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Fetch budget info for multiple campaigns from Facebook API."""
    try:
        return service.get_campaign_budgets(campaign_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budgets/adsets")
def get_adset_budgets(
    adset_ids: List[str],
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Fetch budget info for multiple ad sets from Facebook API."""
    try:
        return service.get_adset_budgets(adset_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Clone Data Endpoint ---

@router.get("/campaigns/{campaign_id}/clone-data")
def get_campaign_clone_data(
    campaign_id: str,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Get all data needed to clone a campaign (targeting, budget, ads)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} fetching clone data for campaign {campaign_id}")
        result = service.get_campaign_clone_data(campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"User {user.id} failed to get clone data for campaign {campaign_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Hierarchy Endpoints for Manage Page ---

@router.get("/hierarchy/campaigns")
def get_campaigns_for_manage(
    account_id: str = Query(..., description="Ad account ID to filter by"),
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get all campaigns with metrics for the Manage page hierarchy view.
    Returns: campaign_id, campaign_name, campaign_status, spend, impressions, clicks, ctr, cpc, conversions, cpa, conv_rate
    """
    # Strip "act_" prefix if present and convert to int
    clean_account_id = int(account_id.replace("act_", ""))

    repo = CampaignRepository(db)
    return repo.get_campaigns_for_manage(
        start_date=start_date,
        end_date=end_date,
        account_ids=[clean_account_id]
    )


@router.get("/hierarchy/campaigns/{campaign_id}/adsets")
def get_adsets_for_campaign(
    campaign_id: int,
    account_id: str = Query(..., description="Ad account ID to filter by"),
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get ad sets for a specific campaign with metrics.
    Returns: adset_id, adset_name, adset_status, spend, impressions, clicks, ctr, cpc, conversions, cpa, conv_rate
    """
    # Strip "act_" prefix if present and convert to int
    clean_account_id = int(account_id.replace("act_", ""))

    repo = AdSetRepository(db)
    return repo.get_adsets_for_campaign(
        campaign_id=campaign_id,
        start_date=start_date,
        end_date=end_date,
        account_ids=[clean_account_id]
    )


@router.get("/hierarchy/adsets/{adset_id}/ads")
def get_ads_for_adset(
    adset_id: int,
    account_id: str = Query(..., description="Ad account ID to filter by"),
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get ads for a specific ad set with metrics.
    Returns: ad_id, ad_name, ad_status, spend, impressions, clicks, ctr, cpc, conversions, cpa, conv_rate
    """
    # Strip "act_" prefix if present and convert to int
    clean_account_id = int(account_id.replace("act_", ""))

    repo = AdRepository(db)
    return repo.get_ads_for_adset(
        adset_id=adset_id,
        start_date=start_date,
        end_date=end_date,
        account_ids=[clean_account_id]
    )


# --- Ads List for Dropdown ---

@router.get("/ads-list")
def get_ads_list(
    adset_id: int,
    account_id: Optional[str] = Query(None, description="Filter by specific ad account ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List ads for an adset (from Local DB).
    Filters by user's accounts for data isolation."""
    repo = AdRepository(db)

    # Get account filter
    account_ids = None
    if account_id:
        account_ids = [int(account_id.replace("act_", ""))]
    else:
        # Get user's account IDs for filtering
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db)
        account_ids = user_repo.get_user_account_ids(user.id)

    ads = repo.get_ads_for_adset(
        adset_id=adset_id,
        start_date=date.today() - timedelta(days=90),
        end_date=date.today(),
        account_ids=account_ids
    )
    return [
        {"id": a['ad_id'], "name": a['ad_name']}
        for a in ads
    ]


# --- Edit Endpoints ---

@router.get("/adsets/{adset_id}/targeting")
def get_adset_targeting(
    adset_id: str,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Fetch current ad set targeting settings (locations, age range) from Facebook."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} fetching adset {adset_id} targeting")
        result = service.get_adset_targeting(adset_id)
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to fetch adset {adset_id} targeting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ads/{ad_id}/creative")
def get_ad_creative(
    ad_id: str,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Fetch current ad creative details (copy, media, form) from Facebook."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} fetching ad {ad_id} creative")
        result = service.get_ad_creative(ad_id)
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to fetch ad {ad_id} creative: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/adsets/{adset_id}/targeting")
def update_adset_targeting(
    adset_id: str,
    request: UpdateAdSetTargetingRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Update ad set targeting (locations, age range, budget)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating adset {adset_id} targeting")
        result = service.update_adset_targeting(adset_id, request)
        logger.info(f"User {user.id} successfully updated adset {adset_id} targeting")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update adset {adset_id} targeting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/ads/{ad_id}/creative")
def update_ad_creative(
    ad_id: str,
    request: UpdateAdCreativeRequest,
    service: AdMutationService = Depends(get_mutation_service),
    user: User = Depends(get_current_user)
):
    """Update ad creative (copy, media, form)."""
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"User {user.id} updating ad {ad_id} creative")
        result = service.update_ad_creative(ad_id, request)
        logger.info(f"User {user.id} successfully updated ad {ad_id} creative")
        return result
    except Exception as e:
        logger.error(f"User {user.id} failed to update ad {ad_id} creative: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Budget Recommendation Endpoint ---

@router.get("/budget-recommendation")
def get_budget_recommendation(
    account_id: str = Query(..., description="Ad account ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get budget recommendation based on account historical data.
    Returns recommended daily budget (in cents) by objective, with fallback for new accounts.
    """
    # Clean account ID
    clean_id = int(account_id.replace("act_", ""))

    repo = MetricsRepository(db)

    # Get last 30 days of spend data
    end_date = date.today()
    start_date = end_date - timedelta(days=30)

    metrics = repo.get_aggregated_metrics(
        start_date=start_date,
        end_date=end_date,
        account_ids=[clean_id]
    )

    total_spend = float(metrics.get('spend', 0) or 0)
    currency = repo.get_account_currency([clean_id])

    # Calculate average daily spend (over 30 days)
    avg_daily_spend = total_spend / 30 if total_spend > 0 else 0

    if avg_daily_spend >= 1:  # At least $1/day average = has historical data
        # Recommend based on average, adjusted by objective
        base_cents = int(avg_daily_spend * 100)
        return {
            "has_historical_data": True,
            "average_daily_spend": round(avg_daily_spend, 2),
            "recommended_budget": {
                "SALES": int(base_cents * 1.5),      # Conversions cost more
                "LEADS": int(base_cents * 1.2),      # Leads moderate cost
                "TRAFFIC": base_cents,                # Base recommendation
                "ENGAGEMENT": int(base_cents * 0.8)  # Engagement cheaper
            },
            "min_budget": 100,  # $1 minimum
            "currency": currency
        }
    else:
        # Fallback for new accounts - best practices
        return {
            "has_historical_data": False,
            "average_daily_spend": 0,
            "recommended_budget": {
                "SALES": 2000,      # $20/day for conversions
                "LEADS": 1500,      # $15/day for leads
                "TRAFFIC": 1000,    # $10/day for traffic
                "ENGAGEMENT": 1000  # $10/day for engagement
            },
            "min_budget": 100,
            "currency": currency
        }


# --- Existing Post Endpoints ---

@router.get("/page-posts")
def get_page_posts(
    account_id: str = Query(..., description="Ad Account ID"),
    page_id: str = Query(..., description="Facebook Page ID"),
    limit: int = Query(20, ge=1, le=50, description="Number of posts to fetch"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Fetch recent posts from a Facebook Page for use as ad creatives."""
    try:
        posts = service.get_page_posts(page_id, account_id, limit)
        return {"posts": posts, "source": "facebook"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/instagram-posts")
def get_instagram_posts(
    account_id: str = Query(..., description="Ad Account ID"),
    page_id: str = Query(..., description="Facebook Page ID (linked to Instagram)"),
    limit: int = Query(20, ge=1, le=50, description="Number of posts to fetch"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Fetch recent posts from the Instagram account connected to a Facebook Page."""
    try:
        posts = service.get_instagram_posts(page_id, account_id, limit)
        # Also return whether Instagram is connected
        ig_account_id = service.get_instagram_account_id(page_id, account_id)
        return {
            "posts": posts,
            "source": "instagram",
            "instagram_connected": ig_account_id is not None,
            "instagram_account_id": ig_account_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Historical Recommendations for AI Captain ---

@router.get("/captain/historical-recommendations")
def get_captain_historical_recommendations(
    account_id: str = Query(..., description="Ad Account ID"),
    lookback_days: int = Query(90, ge=30, le=365, description="Days to look back for historical data"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get historical recommendations for AI Captain based on past campaign performance.
    Returns age groups, locations, CTAs, campaigns for clone, and ads for creative clone.
    """
    from backend.api.repositories.captain_recommendations_repository import CaptainRecommendationsRepository
    import logging
    logger = logging.getLogger(__name__)

    try:
        # Clean account ID
        clean_id = int(account_id.replace("act_", ""))

        repo = CaptainRecommendationsRepository(db)
        recommendations = repo.get_historical_recommendations([clean_id], lookback_days)

        logger.info(f"User {user.id} fetched captain recommendations for account {account_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Failed to fetch captain recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Lead Funnel Endpoints ---

@router.get("/funnel-stages", response_model=FunnelStagesResponse)
def get_funnel_stages(
    account_id: str = Query(..., description="Ad Account ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get funnel stage names for account. Creates default stages if none exist."""
    from backend.api.repositories.lead_funnel_repository import LeadFunnelRepository

    clean_id = int(account_id.replace("act_", ""))
    repo = LeadFunnelRepository(db)
    stages = repo.get_funnel_stages(clean_id)
    return FunnelStagesResponse(stages=stages)


@router.put("/funnel-stages", response_model=FunnelStagesResponse)
def update_funnel_stages(
    request: UpdateFunnelStagesRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update funnel stage names for account."""
    from backend.api.repositories.lead_funnel_repository import LeadFunnelRepository
    import logging
    logger = logging.getLogger(__name__)

    clean_id = int(request.account_id.replace("act_", ""))
    repo = LeadFunnelRepository(db)

    logger.info(f"User {user.id} updating funnel stages for account {request.account_id}")
    stages = repo.update_funnel_stages(clean_id, request.stages)
    return FunnelStagesResponse(stages=stages)


@router.get("/leads/stages", response_model=LeadStagesResponse)
def get_lead_stages(
    account_id: str = Query(..., description="Ad Account ID"),
    lead_form_id: str = Query(..., description="Lead form ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get stage assignments for all leads in a form."""
    from backend.api.repositories.lead_funnel_repository import LeadFunnelRepository

    clean_id = int(account_id.replace("act_", ""))
    repo = LeadFunnelRepository(db)
    stages = repo.get_lead_stages(clean_id, lead_form_id)
    return LeadStagesResponse(stages=stages)


@router.put("/leads/{lead_id}/stage")
def update_lead_stage(
    lead_id: str,
    request: UpdateLeadStageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update a lead's funnel stage."""
    from backend.api.repositories.lead_funnel_repository import LeadFunnelRepository
    import logging
    logger = logging.getLogger(__name__)

    clean_id = int(request.account_id.replace("act_", ""))
    repo = LeadFunnelRepository(db)

    logger.info(f"User {user.id} updating lead {lead_id} to stage {request.stage_index}")
    stage_index = repo.update_lead_stage(clean_id, lead_id, request.lead_form_id, request.stage_index)
    return {"success": True, "lead_id": lead_id, "stage_index": stage_index}
