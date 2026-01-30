"""
External integrations schemas - API contracts for third-party services.
This module defines Pydantic models for integrating with external ad creation tools.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


# ============================================================================
# NANO BANANA AD CREATION API CONTRACT
# ============================================================================
# Note: This is the planned API contract for future Nano Banana integration.
# Nano Banana is an external tool for AI-powered ad creative generation.
# Implementation TBD when Nano Banana API documentation is available.
# ============================================================================

class NanoBananaBusinessProfile(BaseModel):
    """Business profile data to send to Nano Banana for context-aware ad generation."""

    # Core business info
    business_type: str = Field(..., description="Type of business: ecommerce, lead_gen, saas, local_business, etc.")
    business_model: str = Field(..., description="Business model: b2b, b2c, b2b2c")
    industry: str = Field(..., description="Industry/niche")
    business_description: str = Field(..., description="2-3 sentence summary of what the business does")

    # Target audience
    target_audience: str = Field(..., description="Description of ideal customer profile (ICP)")
    geographic_focus: List[str] = Field(default_factory=list, description="Countries or regions of focus")

    # Brand identity
    tone_of_voice: str = Field(..., description="Brand tone: professional, casual, playful, authoritative, etc.")
    value_propositions: List[str] = Field(default_factory=list, description="Key value propositions")

    # Products/services
    products_services: List[str] = Field(default_factory=list, description="Main products or services offered")

    # Visual branding
    visual_style: Optional[Dict[str, str]] = Field(None, description="Visual style notes (colors, imagery)")
    brand_colors: Optional[List[str]] = Field(None, description="Brand color palette (hex codes)")
    logo_url: Optional[str] = Field(None, description="URL to brand logo")

    # Social media context (optional)
    content_themes: Optional[List[str]] = Field(None, description="Recurring content themes from social posts")
    posting_style: Optional[str] = Field(None, description="Social media posting style")


class NanoBananaAdRequest(BaseModel):
    """Request to Nano Banana API for ad creative generation."""

    # Business context
    business_profile: NanoBananaBusinessProfile = Field(..., description="Business profile for context")

    # Campaign parameters
    campaign_objective: str = Field(..., description="Facebook campaign objective: SALES, LEADS, TRAFFIC, etc.")
    target_platform: str = Field(default="facebook_instagram", description="Platform: facebook, instagram, or both")
    ad_format: str = Field(..., description="Ad format: single_image, video, carousel, collection")

    # Creative requirements
    headline_max_length: int = Field(default=40, description="Max characters for headline")
    primary_text_max_length: int = Field(default=125, description="Max characters for primary text")
    description_max_length: int = Field(default=30, description="Max characters for description")

    # Optional constraints
    call_to_action: Optional[str] = Field(None, description="Preferred CTA: LEARN_MORE, SHOP_NOW, etc.")
    creative_angle: Optional[str] = Field(None, description="Specific angle to emphasize: benefit, urgency, social_proof, etc.")
    num_variants: int = Field(default=3, description="Number of creative variants to generate (1-10)")

    # Media requirements (if applicable)
    generate_images: bool = Field(default=False, description="Whether to generate AI images")
    image_style: Optional[str] = Field(None, description="Image style if generating: realistic, illustration, minimal, etc.")
    product_image_url: Optional[str] = Field(None, description="Product image URL to incorporate")


class NanoBananaCreativeVariant(BaseModel):
    """A single ad creative variant returned by Nano Banana."""

    # Ad copy
    headline: str = Field(..., description="Ad headline")
    primary_text: str = Field(..., description="Primary ad copy")
    description: Optional[str] = Field(None, description="Ad description")
    call_to_action: str = Field(..., description="CTA button text")

    # Media (if generated)
    image_url: Optional[str] = Field(None, description="URL to generated image asset")
    video_url: Optional[str] = Field(None, description="URL to generated video asset")

    # Metadata
    creative_angle: str = Field(..., description="The angle/theme of this variant")
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="AI confidence in this variant (0-1)")


class NanoBananaAdResponse(BaseModel):
    """Response from Nano Banana API with generated ad creatives."""

    # Generated variants
    variants: List[NanoBananaCreativeVariant] = Field(..., description="List of generated creative variants")

    # Performance predictions (optional)
    predicted_ctr_range: Optional[Dict[str, float]] = Field(None, description="Predicted CTR range (min, max)")
    recommended_variant_index: Optional[int] = Field(None, description="Index of recommended variant to start with")

    # Metadata
    generation_id: str = Field(..., description="Unique ID for this generation batch")
    model_version: str = Field(..., description="Nano Banana model version used")
    credits_used: int = Field(default=1, description="API credits consumed")


# ============================================================================
# FUTURE INTEGRATIONS
# ============================================================================
# Add other external integration contracts here as needed.
# Examples: Canva API, Adobe Express, Stock photo services, etc.
# ============================================================================
