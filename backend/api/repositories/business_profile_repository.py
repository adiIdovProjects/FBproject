"""
Business profile repository for CRUD operations on business_profiles table.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict
from backend.models.schema import BusinessProfile
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)


class BusinessProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_or_update(
        self,
        account_id: int,
        website_url: Optional[str] = None,
        business_description: Optional[str] = None
    ) -> BusinessProfile:
        """Create or update a business profile for an account."""
        existing = self.db.query(BusinessProfile).filter(
            BusinessProfile.account_id == account_id
        ).first()

        if existing:
            if website_url is not None:
                existing.website_url = website_url
            if business_description is not None:
                existing.business_description = business_description
            existing.analysis_status = 'pending'
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            profile = BusinessProfile(
                account_id=account_id,
                website_url=website_url,
                business_description=business_description,
                analysis_status='pending'
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
            return profile

    def get_by_account_id(self, account_id: int) -> Optional[BusinessProfile]:
        """Get business profile for an account."""
        return self.db.query(BusinessProfile).filter(
            BusinessProfile.account_id == account_id
        ).first()

    def update_analysis(self, account_id: int, analysis_data: Dict) -> Optional[BusinessProfile]:
        """Update business profile with AI analysis results."""
        profile = self.get_by_account_id(account_id)
        if not profile:
            return None

        # Update structured fields from analysis
        for field in [
            'business_type', 'business_model', 'target_audience', 'tone_of_voice',
            'products_services', 'geographic_focus', 'industry', 'value_propositions',
            'visual_style_notes', 'business_description'
        ]:
            if field in analysis_data and analysis_data[field] is not None:
                value = analysis_data[field]
                # Convert lists/dicts to JSON strings
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                setattr(profile, field, value)

        profile.profile_json = json.dumps(analysis_data)
        profile.analysis_status = 'completed'
        profile.website_analyzed_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_social_analysis(self, account_id: int, social_data: Dict) -> Optional[BusinessProfile]:
        """Update business profile with social media analysis results."""
        profile = self.get_by_account_id(account_id)
        if not profile:
            return None

        for field in ['content_themes', 'posting_style', 'engagement_patterns']:
            if field in social_data and social_data[field] is not None:
                value = social_data[field]
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                setattr(profile, field, value)

        # Merge tone_of_voice from social if not already set from website
        if social_data.get('tone_of_voice') and not profile.tone_of_voice:
            profile.tone_of_voice = social_data['tone_of_voice']

        profile.social_analyzed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def set_status(self, account_id: int, status: str) -> None:
        """Update analysis status."""
        profile = self.get_by_account_id(account_id)
        if profile:
            profile.analysis_status = status
            self.db.commit()

    def to_dict(self, profile: BusinessProfile) -> Dict:
        """Convert profile to dictionary."""
        if not profile:
            return None

        def parse_json_field(val):
            if val and isinstance(val, str):
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, ValueError):
                    return val
            return val

        return {
            "id": profile.id,
            "account_id": profile.account_id,
            "website_url": profile.website_url,
            "business_description": profile.business_description,
            "business_type": profile.business_type,
            "business_model": profile.business_model,
            "target_audience": profile.target_audience,
            "tone_of_voice": profile.tone_of_voice,
            "products_services": parse_json_field(profile.products_services),
            "geographic_focus": parse_json_field(profile.geographic_focus),
            "industry": profile.industry,
            "value_propositions": parse_json_field(profile.value_propositions),
            "visual_style_notes": profile.visual_style_notes,
            "content_themes": parse_json_field(profile.content_themes),
            "posting_style": profile.posting_style,
            "engagement_patterns": parse_json_field(profile.engagement_patterns),
            "analysis_status": profile.analysis_status,
            "website_analyzed_at": profile.website_analyzed_at.isoformat() if profile.website_analyzed_at else None,
            "social_analyzed_at": profile.social_analyzed_at.isoformat() if profile.social_analyzed_at else None,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }
