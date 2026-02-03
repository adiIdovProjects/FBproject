"""
Pixel Event Scanner Service.

Fetches pixel health, event stats, and combines with DB data
to provide an optimization summary for campaign building.
"""

import logging
import time
import requests
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount

from backend.config.base_config import settings

logger = logging.getLogger(__name__)

# Maps business_type to expected pixel events
BUSINESS_EVENT_EXPECTATIONS = {
    "ecommerce": {
        "events": ["Purchase", "AddToCart", "ViewContent"],
        "warning": "Your business is ecommerce but your pixel isn't tracking {missing}. Consider adding this event for better optimization."
    },
    "lead_gen": {
        "events": ["Lead"],
        "warning": "Your business generates leads but no Lead pixel event detected. You may still use Facebook Lead Forms."
    },
    "saas": {
        "events": ["CompleteRegistration", "StartTrial"],
        "warning": "Your SaaS business could benefit from tracking {missing} events on your pixel."
    },
    "local_business": {
        "events": ["Contact", "Schedule"],
        "warning": "Local businesses benefit from tracking {missing} events for optimization."
    },
}


class PixelService:
    """Service for scanning Facebook Pixel events and building optimization summaries."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.app_id = settings.FACEBOOK_APP_ID
        self.app_secret = settings.FACEBOOK_APP_SECRET
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)

    def get_account_pixels(self, account_id: str) -> List[Dict[str, Any]]:
        """Fetch pixels for an ad account with health info."""
        try:
            clean_id = account_id.replace("act_", "")
            account = AdAccount(f"act_{clean_id}")
            pixels = account.get_ads_pixels(
                fields=['id', 'name', 'is_unavailable', 'last_fired_time']
            )

            results = []
            for pixel in pixels:
                last_fired = pixel.get('last_fired_time')
                # Determine health status
                if not last_fired:
                    health = "never_fired"
                else:
                    # last_fired_time is unix timestamp
                    try:
                        age_days = (time.time() - int(last_fired)) / 86400
                        if age_days <= 1:
                            health = "healthy"
                        elif age_days <= 7:
                            health = "active"
                        else:
                            health = "stale"
                    except (ValueError, TypeError):
                        health = "unknown"

                results.append({
                    'id': pixel.get('id'),
                    'name': pixel.get('name'),
                    'is_unavailable': pixel.get('is_unavailable', False),
                    'last_fired_time': last_fired,
                    'health': health,
                })
            return results
        except Exception as e:
            logger.error(f"Failed to fetch pixels for account {account_id}: {e}")
            return []

    def get_pixel_event_stats(self, pixel_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get event breakdown for a specific pixel over the last N days."""
        try:
            end_time = int(time.time())
            start_time = end_time - (days * 86400)

            url = f"https://graph.facebook.com/v24.0/{pixel_id}/stats"
            params = {
                'access_token': self.access_token,
                'aggregation': 'event',
                'start_time': start_time,
                'end_time': end_time,
            }

            response = requests.get(url, params=params, timeout=15)
            data = response.json()

            if 'error' in data:
                logger.error(f"Pixel stats API error for {pixel_id}: {data['error']}")
                return []

            events = []
            for item in data.get('data', []):
                events.append({
                    'event_name': item.get('value', 'Unknown'),
                    'count': item.get('count', 0),
                })

            # Sort by count descending
            events.sort(key=lambda x: x['count'], reverse=True)
            return events
        except Exception as e:
            logger.error(f"Failed to fetch pixel stats for {pixel_id}: {e}")
            return []

    def get_lead_forms_summary(self, page_id: str) -> List[Dict[str, Any]]:
        """Fetch lead forms for a page (separate from pixel events)."""
        if not page_id:
            return []
        try:
            # Get page access token first
            url = f"https://graph.facebook.com/v24.0/{page_id}"
            params = {
                'access_token': self.access_token,
                'fields': 'access_token',
            }
            resp = requests.get(url, params=params, timeout=10)
            page_data = resp.json()
            page_token = page_data.get('access_token')

            if not page_token:
                logger.warning(f"No page access token for page {page_id}")
                return []

            # Fetch lead forms
            url = f"https://graph.facebook.com/v24.0/{page_id}/leadgen_forms"
            params = {
                'access_token': page_token,
                'fields': 'id,name,status,leads_count',
            }
            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()

            forms = []
            for form in data.get('data', []):
                forms.append({
                    'id': form.get('id'),
                    'name': form.get('name'),
                    'status': form.get('status'),
                    'leads_count': form.get('leads_count', 0),
                })
            return forms
        except Exception as e:
            logger.error(f"Failed to fetch lead forms for page {page_id}: {e}")
            return []

    def get_optimization_summary(
        self,
        account_id: str,
        db: Session,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Build a complete optimization summary:
        - Pixel events with counts
        - Active campaign objectives (from DB)
        - Lead forms (if page connected)
        - Smart warnings based on business profile
        """
        clean_id = account_id.replace("act_", "")

        # 1. Get pixels and their events
        pixels = self.get_account_pixels(account_id)
        all_events = []
        pixel_details = []
        for pixel in pixels:
            events = self.get_pixel_event_stats(pixel['id'])
            pixel_details.append({**pixel, 'events': events})
            all_events.extend(events)

        # Deduplicate events across pixels (sum counts for same event)
        event_map = {}
        for ev in all_events:
            name = ev['event_name']
            event_map[name] = event_map.get(name, 0) + ev['count']
        merged_events = [
            {'event_name': k, 'count': v}
            for k, v in sorted(event_map.items(), key=lambda x: -x[1])
        ]

        # 2. Get active objectives from DB
        active_objectives = []
        try:
            result = db.execute(text("""
                SELECT DISTINCT objective
                FROM dim_campaign
                WHERE account_id = :account_id
                    AND campaign_status = 'ACTIVE'
                    AND objective IS NOT NULL
                    AND objective != 'N/A'
                ORDER BY objective
            """), {"account_id": int(clean_id)})
            active_objectives = [row[0] for row in result.fetchall()]
        except Exception as e:
            logger.error(f"Failed to fetch active objectives: {e}")

        # 3. Get lead forms
        lead_forms = self.get_lead_forms_summary(page_id) if page_id else []

        # 4. Smart warnings
        warnings = self._build_warnings(clean_id, db, merged_events, lead_forms)

        return {
            "pixels": pixel_details,
            "events": merged_events,
            "active_objectives": active_objectives,
            "lead_forms": lead_forms,
            "has_pixel": len(pixels) > 0,
            "has_active_events": len(merged_events) > 0,
            "has_lead_forms": len(lead_forms) > 0,
            "warnings": warnings,
        }

    def _build_warnings(
        self,
        account_id: str,
        db: Session,
        events: List[Dict],
        lead_forms: List[Dict]
    ) -> List[Dict[str, str]]:
        """Generate smart warnings by cross-referencing business profile with pixel events."""
        warnings = []

        # Fetch business profile
        try:
            result = db.execute(text("""
                SELECT business_type FROM business_profiles
                WHERE account_id = :account_id
            """), {"account_id": int(account_id)})
            row = result.fetchone()
            if not row or not row[0]:
                return warnings
            business_type = row[0].lower()
        except Exception as e:
            logger.error(f"Failed to fetch business profile: {e}")
            return warnings

        expectations = BUSINESS_EVENT_EXPECTATIONS.get(business_type)
        if not expectations:
            return warnings

        event_names = {ev['event_name'] for ev in events}
        missing = [e for e in expectations['events'] if e not in event_names]

        # For lead_gen, also check if lead forms exist
        if business_type == 'lead_gen' and lead_forms:
            missing = [e for e in missing if e != 'Lead']

        if missing:
            warnings.append({
                "type": "missing_events",
                "business_type": business_type,
                "missing_events": missing,
                "message": expectations['warning'].format(missing=', '.join(missing)),
            })

        # Warn if no pixel at all
        if not events:
            warnings.append({
                "type": "no_pixel_events",
                "message": "No pixel events detected in the last 30 days. Your pixel may not be installed correctly.",
            })

        return warnings
