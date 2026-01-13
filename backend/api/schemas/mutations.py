from typing import Optional, List, Literal
from pydantic import BaseModel, Field, HttpUrl

class SmartCreative(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Headline of the ad")
    body: str = Field(..., description="Primary text of the ad")
    call_to_action: str = Field("LEARN_MORE", description="Call to action button text")
    
    # Media (One of these should be present)
    image_hash: Optional[str] = Field(None, description="Hash of the uploaded image")
    video_id: Optional[str] = Field(None, description="ID of the uploaded video")
    
    # Destination
    link_url: Optional[HttpUrl] = Field(None, description="Website URL")
    lead_form_id: Optional[str] = Field(None, description="Instant Form ID (for Leads)")

class AddCreativeRequest(BaseModel):
    account_id: str
    page_id: str
    campaign_id: str
    adset_id: str
    creative: SmartCreative


class GeoLocationTarget(BaseModel):
    """A geographic location for targeting"""
    key: str = Field(..., description="Facebook location key")
    type: Literal["country", "region", "city"] = Field(..., description="Type of location")
    name: str = Field(..., description="Display name of location")
    country_code: Optional[str] = Field(None, description="ISO country code")


class SmartCampaignRequest(BaseModel):
    account_id: str = Field(..., description="Ad Account ID")
    page_id: str = Field(..., description="Facebook Page ID for identity")
    campaign_name: str = Field(..., description="Name of the campaign")

    # Step 1: Objective
    objective: str = Field(..., pattern="^(SALES|LEADS|TRAFFIC|ENGAGEMENT)$", description="Simplified objective")

    # Step 2: Scope / Targeting
    geo_locations: List[GeoLocationTarget] = Field(..., min_length=1, description="Target locations (countries, cities, regions)")
    age_min: int = Field(18, ge=18, le=65)
    age_max: int = Field(65, ge=18, le=65)
    daily_budget_cents: int = Field(..., gt=100, description="Daily budget in cents (e.g., 2000 = $20)")

    # Pixel for SALES objective
    pixel_id: Optional[str] = Field(None, description="Facebook Pixel ID (required for SALES objective)")

    # Step 3: Creative
    creative: SmartCreative


# --- Status & Budget Update Schemas ---

class StatusUpdateRequest(BaseModel):
    """Request body for updating campaign/adset/ad status"""
    status: Literal["ACTIVE", "PAUSED"] = Field(..., description="New status: ACTIVE or PAUSED")


class BudgetUpdateRequest(BaseModel):
    """Request body for updating ad set budget"""
    daily_budget_cents: int = Field(..., gt=100, description="Daily budget in cents (minimum 100 = $1)")
