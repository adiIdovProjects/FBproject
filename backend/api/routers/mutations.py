from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from typing import Dict, Any, Optional

from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.adset_repository import AdSetRepository
from backend.api.repositories.ad_repository import AdRepository
from backend.api.schemas.mutations import SmartCampaignRequest, AddCreativeRequest, StatusUpdateRequest, BudgetUpdateRequest, UpdateAdSetTargetingRequest, UpdateAdCreativeRequest
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
    return AdMutationService(access_token=user.fb_access_token)

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

@router.get("/targeting/search")
def search_targeting_locations(
    q: str = Query(..., min_length=2, description="Search query for location"),
    location_types: str = Query("country,region,city", description="Comma-separated location types"),
    service: AdMutationService = Depends(get_mutation_service)
):
    """Search for targeting locations (countries, cities, regions) via Facebook API."""
    try:
        types_list = [t.strip() for t in location_types.split(",")]
        return service.search_targeting_locations(q, types_list)
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
