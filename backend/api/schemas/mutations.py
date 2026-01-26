from typing import Optional, List, Literal
from datetime import date
from pydantic import BaseModel, Field, HttpUrl

class CarouselCard(BaseModel):
    """A single card in a carousel ad (2-10 cards required)"""
    image_hash: Optional[str] = Field(None, description="Hash of the uploaded image")
    video_id: Optional[str] = Field(None, description="ID of the uploaded video")
    title: str = Field("", max_length=255, description="Card headline")


class SmartCreative(BaseModel):
    # When using existing post, title/body/cta can be empty
    title: str = Field("", max_length=255, description="Headline of the ad")
    body: str = Field("", description="Primary text of the ad")
    call_to_action: str = Field("LEARN_MORE", description="Call to action button text")

    # Media (One of these should be present, OR object_story_id for existing post, OR carousel_cards)
    image_hash: Optional[str] = Field(None, description="Hash of the uploaded image")
    video_id: Optional[str] = Field(None, description="ID of the uploaded video")

    # Carousel (alternative to single image/video)
    carousel_cards: Optional[List[CarouselCard]] = Field(None, description="Carousel cards (2-10 cards)")

    # Existing post (alternative to uploading new media)
    object_story_id: Optional[str] = Field(None, description="Existing post ID (format: {page_id}_{post_id})")

    # Destination
    link_url: Optional[HttpUrl] = Field(None, description="Website URL")
    lead_form_id: Optional[str] = Field(None, description="Instant Form ID (for Leads)")

class AddCreativeRequest(BaseModel):
    account_id: str
    page_id: str
    campaign_id: str
    adset_id: str
    creative: SmartCreative
    ad_name: Optional[str] = Field(None, description="Custom name for the ad")


class GeoLocationTarget(BaseModel):
    """A geographic location for targeting"""
    key: str = Field(..., description="Facebook location key")
    type: Literal["country", "region", "city"] = Field(..., description="Type of location")
    name: str = Field(..., description="Display name of location")
    country_code: Optional[str] = Field(None, description="ISO country code")


class InterestTarget(BaseModel):
    """An interest for targeting"""
    id: str = Field(..., description="Facebook interest ID")
    name: str = Field(..., description="Interest name")


class SmartCampaignRequest(BaseModel):
    account_id: str = Field(..., description="Ad Account ID")
    page_id: str = Field(..., description="Facebook Page ID for identity")
    campaign_name: str = Field(..., description="Name of the campaign")

    # Step 1: Objective
    objective: str = Field(..., pattern="^(SALES|LEADS|TRAFFIC|ENGAGEMENT|WHATSAPP|CALLS)$", description="Simplified objective")

    # Step 2: Scope / Targeting
    geo_locations: List[GeoLocationTarget] = Field(..., min_length=1, description="Target locations (countries, cities, regions)")
    age_min: int = Field(18, ge=18, le=65)
    age_max: int = Field(65, ge=18, le=65)
    genders: Optional[List[int]] = Field(None, description="Gender targeting: [1] = male, [2] = female, None/empty = all")
    publisher_platforms: Optional[List[str]] = Field(None, description="Platform targeting: ['facebook'], ['instagram'], None = all")
    daily_budget_cents: int = Field(..., ge=100, description="Daily budget in local currency cents (frontend validates ~$5 USD equivalent)")

    # Custom audiences (lookalikes, saved audiences) - optional
    custom_audiences: Optional[List[str]] = Field(None, description="List of custom audience IDs to target")

    # Excluded audiences - optional
    excluded_audiences: Optional[List[str]] = Field(None, description="List of custom audience IDs to exclude")

    # Interest targeting - optional
    interests: Optional[List[InterestTarget]] = Field(None, description="List of interests to target")

    # Language targeting - optional
    locales: Optional[List[int]] = Field(None, description="Facebook locale codes for language targeting (e.g., 6=English, 23=Hebrew)")

    # Pixel for SALES objective
    pixel_id: Optional[str] = Field(None, description="Facebook Pixel ID (required for SALES objective)")

    # Step 3: Creative
    creative: SmartCreative

    # Optional custom names (defaults generated if not provided)
    adset_name: Optional[str] = Field(None, description="Custom name for the ad set")
    ad_name: Optional[str] = Field(None, description="Custom name for the ad")

    # Optional scheduling
    start_date: Optional[date] = Field(None, description="Campaign start date (YYYY-MM-DD). If not set, starts immediately.")
    end_date: Optional[date] = Field(None, description="Campaign end date (YYYY-MM-DD). If not set, runs indefinitely.")


# --- Status & Budget Update Schemas ---

class StatusUpdateRequest(BaseModel):
    """Request body for updating campaign/adset/ad status"""
    status: Literal["ACTIVE", "PAUSED"] = Field(..., description="New status: ACTIVE or PAUSED")


class BudgetUpdateRequest(BaseModel):
    """Request body for updating ad set budget"""
    daily_budget_cents: int = Field(..., ge=100, description="Daily budget in local currency cents (frontend validates ~$5 USD equivalent)")


# --- Edit Schemas ---

class UpdateAdSetTargetingRequest(BaseModel):
    """Request body for updating ad set targeting"""
    geo_locations: Optional[List[GeoLocationTarget]] = Field(None, description="New target locations")
    age_min: Optional[int] = Field(None, ge=18, le=65)
    age_max: Optional[int] = Field(None, ge=18, le=65)
    daily_budget_cents: Optional[int] = Field(None, ge=100, description="Daily budget in local currency cents (frontend validates ~$5 USD equivalent)")


class UpdateAdCreativeRequest(BaseModel):
    """Request body for updating ad creative"""
    account_id: str = Field(..., description="Ad Account ID for uploading new media")
    page_id: str = Field(..., description="Facebook Page ID")
    title: Optional[str] = Field(None, max_length=255, description="New headline")
    body: Optional[str] = Field(None, description="New primary text")
    call_to_action: Optional[str] = Field(None, description="New CTA button text")
    image_hash: Optional[str] = Field(None, description="Hash of new uploaded image")
    video_id: Optional[str] = Field(None, description="ID of new uploaded video")
    link_url: Optional[HttpUrl] = Field(None, description="New website URL")
    lead_form_id: Optional[str] = Field(None, description="New Instant Form ID")


class CustomQuestion(BaseModel):
    """A custom question for lead forms"""
    label: str = Field(..., min_length=1, max_length=255, description="Question text shown to user")
    field_type: str = Field("TEXT", description="Type of input: TEXT, SELECT")
    options: Optional[List[str]] = Field(None, description="Options for SELECT type questions")
    allow_multiple: Optional[bool] = Field(False, description="Allow multiple selections for SELECT type")


class CreateLeadFormRequest(BaseModel):
    """Request body for creating a new lead form"""
    page_id: str = Field(..., description="Facebook Page ID")
    account_id: Optional[str] = Field(None, description="Ad Account ID (optional, helps get page token)")
    form_name: str = Field(..., min_length=1, max_length=255, description="Name for the lead form")
    # Form intro/context
    headline: Optional[str] = Field(None, max_length=60, description="Form headline (max 60 chars)")
    description: Optional[str] = Field(None, max_length=800, description="Form description/intro text")
    # Questions
    questions: List[str] = Field(
        ...,
        min_length=1,
        description="List of question types: EMAIL, FULL_NAME, PHONE_NUMBER, CITY, STATE, COUNTRY, ZIP, JOB_TITLE, COMPANY_NAME"
    )
    custom_questions: Optional[List[CustomQuestion]] = Field(None, description="Custom questions to add")
    # Privacy & thank you
    privacy_policy_url: str = Field(..., description="URL to privacy policy (required by Facebook)")
    # Thank you screen
    thank_you_title: Optional[str] = Field(None, max_length=60, description="Thank you page title")
    thank_you_body: Optional[str] = Field(None, max_length=160, description="Thank you page message")
    thank_you_button_text: Optional[str] = Field(None, max_length=30, description="Thank you button text")
    thank_you_url: Optional[str] = Field(None, description="Website URL for thank you button")


class LeadRecord(BaseModel):
    """A single lead record from a lead form submission"""
    id: str = Field(..., description="Facebook lead ID")
    created_time: Optional[str] = Field(None, description="When the lead was submitted")
    # Dynamic fields from form (email, full_name, phone_number, etc.)
    # These are added dynamically based on form questions

    class Config:
        extra = "allow"  # Allow dynamic fields from form questions


class LeadsResponse(BaseModel):
    """Response containing leads from a lead form"""
    leads: List[LeadRecord]
    total: int = Field(..., description="Total number of leads returned")


class CreateCustomAudienceRequest(BaseModel):
    """Request body for creating a custom audience from pixel data"""
    account_id: str = Field(..., description="Ad Account ID")
    name: str = Field(..., min_length=1, max_length=255, description="Audience name")
    pixel_id: str = Field(..., description="Facebook Pixel ID")
    event_type: str = Field(
        "PageView",
        description="Pixel event type: PageView, ViewContent, AddToCart, Purchase, Lead"
    )
    retention_days: int = Field(
        30,
        ge=1,
        le=180,
        description="Days to retain users in audience (1-180)"
    )


class CreatePageEngagementAudienceRequest(BaseModel):
    """Request body for creating a custom audience from Page engagement"""
    account_id: str = Field(..., description="Ad Account ID")
    name: str = Field(..., min_length=1, max_length=255, description="Audience name")
    page_id: str = Field(..., description="Facebook Page ID")
    engagement_type: str = Field(
        "page_engaged",
        description="Engagement type: page_engaged, page_visited, page_liked, page_saved, page_messaged"
    )
    retention_days: int = Field(
        365,
        ge=1,
        le=365,
        description="Days to retain users in audience (1-365)"
    )


class CreateLookalikeAudienceRequest(BaseModel):
    """Request body for creating a lookalike audience"""
    account_id: str = Field(..., description="Ad Account ID")
    name: str = Field(..., min_length=1, max_length=255, description="Audience name")
    source_audience_id: str = Field(..., description="Source custom audience ID")
    country_code: str = Field(..., min_length=2, max_length=2, description="Target country (ISO code, e.g., US, IL)")
    ratio: float = Field(
        0.01,
        ge=0.01,
        le=0.10,
        description="Lookalike ratio (0.01 = 1%, 0.10 = 10%)"
    )
