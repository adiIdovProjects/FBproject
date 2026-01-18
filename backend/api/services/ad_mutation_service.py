import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
from sqlalchemy.orm import Session
from sqlalchemy import text


from backend.api.schemas.mutations import SmartCampaignRequest
from backend.config.base_config import settings

logger = logging.getLogger(__name__)

class AdMutationService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.app_id = settings.FACEBOOK_APP_ID
        self.app_secret = settings.FACEBOOK_APP_SECRET
        self._init_api()

    def _init_api(self):
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)

    @contextmanager
    def _temp_file_for_upload(self, file_content: bytes, filename: str):
        """Context manager ensuring temp file cleanup even if upload fails"""
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_content)
            tmp.flush()
            tmp_path = tmp.name

        try:
            yield tmp_path
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _get_page_access_token(self, page_id: str, account_id: str = None) -> str:
        """Get Page Access Token for a specific page.

        Tries multiple methods:
        1. Ad account's promoted pages (if account_id provided)
        2. /me/accounts (pages user manages directly)
        3. Direct /{page_id}?fields=access_token request
        """
        api = FacebookAdsApi.get_default_api()
        if not api:
            raise ValueError("Facebook API not initialized.")

        # Method 1: Try ad account's promoted pages (pages connected to the ad account)
        if account_id:
            try:
                clean_id = account_id.replace("act_", "")
                account = AdAccount(f"act_{clean_id}")
                pages = account.get_promote_pages(fields=['id', 'name', 'access_token'])
                for page in pages:
                    if page.get('id') == page_id:
                        token = page.get('access_token')
                        if token:
                            logger.info(f"Found page {page_id} in ad account {account_id} promote_pages")
                            return token
                logger.info(f"Page {page_id} found in promote_pages but no access_token returned")
            except Exception as e:
                logger.warning(f"Failed to fetch promote_pages from ad account: {e}")

        # Method 2: Try /me/accounts (pages user manages)
        try:
            response = api.call('GET', ('me', 'accounts'), {'fields': 'id,name,access_token'})
            data = response.json()

            for page in data.get('data', []):
                if page['id'] == page_id:
                    logger.info(f"Found page {page_id} in /me/accounts")
                    return page['access_token']

            available_pages = [(p.get('id'), p.get('name')) for p in data.get('data', [])]
            logger.info(f"Page {page_id} not in /me/accounts. Available: {available_pages}")
        except Exception as e:
            logger.warning(f"Failed to fetch /me/accounts: {e}")

        # Method 3: Try direct page token request
        try:
            response = api.call('GET', (page_id,), {'fields': 'access_token'})
            data = response.json()
            if 'access_token' in data:
                logger.info(f"Got page token via direct /{page_id} request")
                return data['access_token']
        except Exception as e:
            logger.warning(f"Failed to get token via /{page_id}: {e}")

        raise ValueError(f"No access to page {page_id}. Make sure you have admin access to this Facebook Page.")

    def _build_creative_params(self, page_id: str, creative, creative_name: str = None) -> Dict[str, Any]:
        """
        Shared logic for building AdCreative object_story_spec.
        Handles both image/video creatives and lead form creatives.
        """
        if creative_name is None:
            creative_name = f"Creative - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        params = {
            AdCreative.Field.name: creative_name,
            AdCreative.Field.object_story_spec: {
                "page_id": page_id,
                "link_data": {
                    "message": creative.body,
                    "link": str(creative.link_url) if creative.link_url else f"https://facebook.com/{page_id}",
                    "name": creative.title,
                    "call_to_action": {"type": creative.call_to_action}
                }
            }
        }

        # Media handling
        if creative.image_hash:
            params[AdCreative.Field.object_story_spec]["link_data"]["image_hash"] = creative.image_hash
        elif creative.video_id:
            params[AdCreative.Field.object_story_spec]["link_data"]["video_id"] = creative.video_id

        # Lead form override (changes structure completely)
        if creative.lead_form_id:
            params[AdCreative.Field.object_story_spec] = {
                "page_id": page_id,
                "template_data": {
                    "description": creative.body,
                    "link": str(creative.link_url) if creative.link_url else f"https://facebook.com/{page_id}",
                    "name": creative.title,
                    "call_to_action": {"type": creative.call_to_action},
                    "lead_gen_form_id": creative.lead_form_id
                }
            }
            # Add image/video to template_data if present
            if creative.image_hash:
                params[AdCreative.Field.object_story_spec]["template_data"]["image_hash"] = creative.image_hash
            elif creative.video_id:
                params[AdCreative.Field.object_story_spec]["template_data"]["video_id"] = creative.video_id

        return params

    def get_lead_forms(self, page_id: str, account_id: str = None) -> List[Dict[str, Any]]:
        """Fetch available lead gen forms for a page using Page Access Token"""
        import requests

        try:
            # Get page-specific access token (required for leadgen_forms endpoint)
            page_token = self._get_page_access_token(page_id, account_id)

            # Call Facebook API with Page Access Token
            url = f"https://graph.facebook.com/v24.0/{page_id}/leadgen_forms"
            params = {
                'access_token': page_token,
                'fields': 'id,name,status,created_time'
            }
            response = requests.get(url, params=params)
            data = response.json()

            # Check for Facebook API error in response
            if 'error' in data:
                error_info = data['error']
                error_message = error_info.get('message', 'Unknown error')
                raise ValueError(f"Facebook API error: {error_message}")

            # Filter for ACTIVE forms only
            forms = []
            if 'data' in data:
                for form in data['data']:
                    if form.get('status') == 'ACTIVE':
                        forms.append({
                            'id': form['id'],
                            'name': form['name'],
                            'created_time': form.get('created_time')
                        })
            return forms
        except ValueError:
            # Re-raise ValueError (user-friendly errors)
            raise
        except Exception as e:
            logger.error(f"Failed to fetch lead forms for page {page_id}: {str(e)}", exc_info=True)
            raise ValueError(f"Unable to fetch lead forms. This may be due to connectivity issues or invalid permissions. Details: {str(e)}")

    def get_pixels(self, account_id: str) -> List[Dict[str, Any]]:
        """Fetch Facebook Pixels for an ad account"""
        try:
            # Handle both "act_123" and "123" formats
            clean_id = account_id.replace("act_", "")
            account = AdAccount(f"act_{clean_id}")
            # Fetch pixels using the SDK
            pixels = account.get_ads_pixels(fields=['id', 'name', 'code'])

            results = []
            for pixel in pixels:
                results.append({
                    'id': pixel.get('id'),
                    'name': pixel.get('name'),
                    'code': pixel.get('code')  # Pixel code for reference
                })
            return results
        except Exception as e:
            logger.error(f"Failed to fetch pixels for account {account_id}: {e}")
            raise e

    def get_custom_audiences(self, account_id: str) -> List[Dict[str, Any]]:
        """Fetch Custom Audiences (lookalikes, saved audiences) for an ad account"""
        import requests

        try:
            # Handle both "act_123" and "123" formats
            clean_id = account_id.replace("act_", "")

            # Use direct API call instead of SDK (more reliable)
            url = f"https://graph.facebook.com/v24.0/act_{clean_id}/customaudiences"
            params = {
                'access_token': self.access_token,
                'fields': 'id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound'
            }
            logger.info(f"Fetching custom audiences from: {url}")
            response = requests.get(url, params=params)
            data = response.json()
            logger.info(f"Custom audiences API response: {data}")

            if 'error' in data:
                error_info = data['error']
                logger.warning(f"Facebook API error fetching custom audiences: {error_info.get('message')}")
                return []  # Return empty list instead of failing

            results = []
            for audience in data.get('data', []):
                subtype = audience.get('subtype', '')
                # Use average of lower and upper bounds for approximate count
                lower = audience.get('approximate_count_lower_bound', 0) or 0
                upper = audience.get('approximate_count_upper_bound', 0) or 0
                approx_count = (lower + upper) // 2 if (lower or upper) else None

                results.append({
                    'id': audience.get('id'),
                    'name': audience.get('name'),
                    'subtype': subtype,  # LOOKALIKE, CUSTOM, etc.
                    'approximate_count': approx_count,
                    'type_label': 'Lookalike' if subtype == 'LOOKALIKE' else 'Custom Audience'
                })

            logger.info(f"Found {len(results)} custom audiences for account {account_id}")
            return results
        except Exception as e:
            logger.error(f"Failed to fetch custom audiences for account {account_id}: {e}")
            return []  # Return empty list instead of crashing

    def search_targeting_locations(self, query: str, location_types: List[str] = None) -> List[Dict[str, Any]]:
        """Search for targeting locations (countries, cities, regions) via Facebook API."""
        import requests

        if location_types is None:
            location_types = ["country", "region", "city"]

        try:
            url = "https://graph.facebook.com/v24.0/search"
            params = {
                'access_token': self.access_token,
                'type': 'adgeolocation',
                'q': query,
                'location_types': json.dumps(location_types)
            }
            response = requests.get(url, params=params)
            data = response.json()

            if 'error' in data:
                error_info = data['error']
                raise ValueError(f"Facebook API error: {error_info.get('message', 'Unknown error')}")

            results = []
            for item in data.get('data', []):
                result = {
                    'key': item.get('key'),
                    'name': item.get('name'),
                    'type': item.get('type'),
                    'country_code': item.get('country_code'),
                    'country_name': item.get('country_name'),
                    'region': item.get('region'),
                    'region_id': item.get('region_id'),
                    'supports_city': item.get('supports_city', False),
                    'supports_region': item.get('supports_region', False),
                }
                # Build display name
                parts = [item.get('name')]
                if item.get('region'):
                    parts.append(item.get('region'))
                if item.get('country_name') and item.get('type') != 'country':
                    parts.append(item.get('country_name'))
                result['display_name'] = ', '.join(filter(None, parts))
                results.append(result)

            return results
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to search targeting locations: {str(e)}", exc_info=True)
            raise ValueError(f"Unable to search locations: {str(e)}")

    def search_interests(self, query: str) -> List[Dict[str, Any]]:
        """Search for interest targeting options via Facebook API."""
        import requests

        try:
            url = "https://graph.facebook.com/v24.0/search"
            params = {
                'access_token': self.access_token,
                'type': 'adinterest',
                'q': query
            }
            response = requests.get(url, params=params)
            data = response.json()

            if 'error' in data:
                error_info = data['error']
                logger.warning(f"Facebook API error searching interests: {error_info.get('message')}")
                return []

            results = []
            for item in data.get('data', []):
                results.append({
                    'id': item.get('id'),
                    'name': item.get('name'),
                    'audience_size_lower_bound': item.get('audience_size_lower_bound', 0),
                    'audience_size_upper_bound': item.get('audience_size_upper_bound', 0),
                    'path': item.get('path', []),
                    'topic': item.get('topic', '')
                })

            logger.info(f"Found {len(results)} interests for query '{query}'")
            return results
        except Exception as e:
            logger.error(f"Failed to search interests: {str(e)}", exc_info=True)
            return []

    def create_smart_campaign(self, request: SmartCampaignRequest) -> Dict[str, Any]:
        """
        Orchestrates the creation of:
        1. Campaign (PAUSED)
        2. AdSet (Optimization based on goal)
        3. AdCreative (Image/Video + Text)
        4. Ad (PAUSED)
        """
        account = AdAccount(f"act_{request.account_id}")

        # 1. Map Objective -> Campaign Params
        campaign_params = {
            Campaign.Field.name: request.campaign_name,
            Campaign.Field.status: Campaign.Status.paused, # SAFETY FIRST
            Campaign.Field.special_ad_categories: [] # Simplified for now
        }
        
        # Smart Mappings
        if request.objective == "SALES":
            campaign_params[Campaign.Field.objective] = "OUTCOME_SALES"
        elif request.objective == "LEADS":
            campaign_params[Campaign.Field.objective] = "OUTCOME_LEADS"
        elif request.objective == "TRAFFIC":
            campaign_params[Campaign.Field.objective] = "OUTCOME_TRAFFIC"
        elif request.objective == "ENGAGEMENT":
            campaign_params[Campaign.Field.objective] = "OUTCOME_ENGAGEMENT"
        
        logger.info(f"Creating Campaign: {request.campaign_name} for account {request.account_id}")
        campaign = account.create_campaign(params=campaign_params)
        campaign_id = campaign[Campaign.Field.id]
        logger.info(f"Campaign created successfully: {campaign_id}")

        # 2. Build geo_locations targeting structure
        geo_targeting = {}
        countries = []
        regions = []
        cities = []

        for loc in request.geo_locations:
            if loc.type == "country":
                countries.append(loc.country_code or loc.key)
            elif loc.type == "region":
                regions.append({"key": loc.key})
            elif loc.type == "city":
                cities.append({"key": loc.key})

        if countries:
            geo_targeting["countries"] = countries
        if regions:
            geo_targeting["regions"] = regions
        if cities:
            geo_targeting["cities"] = cities

        logger.info(f"Geo targeting: {geo_targeting}")

        # 2. Map Objective -> AdSet Params
        adset_name = request.adset_name or f"{request.campaign_name} - AdSet"

        # Build targeting dict
        targeting = {
            "geo_locations": geo_targeting,
            "age_min": request.age_min,
            "age_max": request.age_max,
        }

        # Add custom audiences if provided (lookalikes, saved audiences)
        if request.custom_audiences and len(request.custom_audiences) > 0:
            targeting["custom_audiences"] = [{"id": aud_id} for aud_id in request.custom_audiences]
            logger.info(f"Adding {len(request.custom_audiences)} custom audiences to targeting")

        # Add excluded audiences if provided
        if request.excluded_audiences and len(request.excluded_audiences) > 0:
            targeting["excluded_custom_audiences"] = [{"id": aud_id} for aud_id in request.excluded_audiences]
            logger.info(f"Excluding {len(request.excluded_audiences)} custom audiences from targeting")

        # Add interests if provided
        if request.interests and len(request.interests) > 0:
            targeting["flexible_spec"] = [{
                "interests": [{"id": interest.id, "name": interest.name} for interest in request.interests]
            }]
            logger.info(f"Adding {len(request.interests)} interests to targeting")

        adset_params = {
            AdSet.Field.name: adset_name,
            AdSet.Field.campaign_id: campaign_id,
            AdSet.Field.status: AdSet.Status.paused,
            AdSet.Field.daily_budget: request.daily_budget_cents,
            AdSet.Field.billing_event: "IMPRESSIONS",
            # Targeting with geo_locations and optional custom audiences
            AdSet.Field.targeting: targeting,
            # Placements: Default is Auto (Advantage+)
        }

        # Optimization Goals & Promoted Object
        if request.objective == "SALES":
            adset_params[AdSet.Field.optimization_goal] = "OFFSITE_CONVERSIONS"
            if request.pixel_id:
                adset_params[AdSet.Field.promoted_object] = {
                    "pixel_id": request.pixel_id,
                    "custom_event_type": "PURCHASE"  # Standard for SALES objective
                }
                logger.info(f"Using pixel {request.pixel_id} for SALES conversion tracking")
            else:
                logger.warning("SALES objective selected but no pixel_id provided - this may cause campaign creation to fail")
        
        elif request.objective == "LEADS":
            if request.creative.lead_form_id:
                adset_params[AdSet.Field.optimization_goal] = "LEADS"
                adset_params[AdSet.Field.destination_type] = "ON_AD" # Instant Forms
                adset_params[AdSet.Field.promoted_object] = {"page_id": request.page_id}
            else:
                adset_params[AdSet.Field.optimization_goal] = "LEADS" # Website Leads
        
        elif request.objective == "TRAFFIC":
            adset_params[AdSet.Field.optimization_goal] = "LINK_CLICKS"

        elif request.objective == "ENGAGEMENT":
            adset_params[AdSet.Field.optimization_goal] = "POST_ENGAGEMENT"

        logger.info(f"Creating AdSet under Campaign {campaign_id}")
        adset = account.create_ad_set(params=adset_params)
        adset_id = adset[AdSet.Field.id]
        logger.info(f"AdSet created successfully: {adset_id}")

        # 3. Create Creative (using shared method)
        creative_params = self._build_creative_params(
            page_id=request.page_id,
            creative=request.creative,
            creative_name=f"{request.campaign_name} - Creative"
        )

        logger.info("Creating AdCreative")
        creative = account.create_ad_creative(params=creative_params)
        creative_id = creative[AdCreative.Field.id]
        logger.info(f"Creative created successfully: {creative_id}")

        # 4. Create Ad
        ad_name = request.ad_name or f"{request.campaign_name} - Ad"
        ad_params = {
            Ad.Field.name: ad_name,
            Ad.Field.adset_id: adset_id,
            Ad.Field.creative: {"creative_id": creative_id},
            Ad.Field.status: Ad.Status.paused
        }
        
        logger.info(f"Creating Ad under AdSet {adset_id}")
        ad = account.create_ad(params=ad_params)
        ad_id = ad[Ad.Field.id]
        logger.info(f"Ad created successfully: {ad_id}. Campaign structure complete.")

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "adset_id": adset_id,
            "ad_id": ad_id,
            "creative_id": creative_id
        }

    def add_creative_to_adset(self, request: Any) -> Dict[str, Any]:
        """
        Calculates creative params and adds it to an existing adset
        """
        account = AdAccount(f"act_{request.account_id}")

        # 1. Create Creative (using shared method)
        creative_params = self._build_creative_params(
            page_id=request.page_id,
            creative=request.creative
        )

        logger.info(f"Creating AdCreative for existing AdSet {request.adset_id}")
        creative = account.create_ad_creative(params=creative_params)
        creative_id = creative[AdCreative.Field.id]

        # 2. Create Ad
        ad_name = request.ad_name or f"Ad - {request.creative.title[:20]}"
        ad_params = {
            Ad.Field.name: ad_name,
            Ad.Field.adset_id: request.adset_id,
            Ad.Field.creative: {"creative_id": creative_id},
            Ad.Field.status: Ad.Status.paused
        }
        
        ad = account.create_ad(params=ad_params)
        
        return {
            "status": "success",
            "ad_id": ad[Ad.Field.id],
            "creative_id": creative_id
        }

    def upload_media(self, account_id: str, file_content: bytes, filename: str, is_video: bool = False) -> Dict[str, str]:
        """Uploads image or video to Facebook Asset Library"""
        account = AdAccount(f"act_{account_id}")

        if is_video:
            # Video Upload (uses context manager for safe cleanup)
            with self._temp_file_for_upload(file_content, filename) as tmp_path:
                video = account.create_ad_video(params={
                    'name': filename,
                    'file_url': tmp_path
                })
                return {"video_id": video.get_id()}

        else:
            # Image Upload (uses context manager for safe cleanup)
            with self._temp_file_for_upload(file_content, filename) as tmp_path:
                image = account.create_ad_image(params={
                    'filename': tmp_path
                })
                # Image Create returns list of images or dictionary
                if isinstance(image, list) and len(image) > 0:
                    return {"image_hash": image[0][AdImage.Field.hash]}
                return {"image_hash": image[AdImage.Field.hash]}

    # --- Status & Budget Mutations ---

    def update_campaign_status(self, campaign_id: str, status: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Pause or activate a campaign.
        Args:
            campaign_id: Facebook campaign ID
            status: 'PAUSED' or 'ACTIVE'
            db: Optional database session for immediate local sync
        """
        try:
            logger.info(f"Updating campaign {campaign_id} status to {status}")
            campaign = Campaign(campaign_id)
            campaign.api_update(params={Campaign.Field.status: status})
            logger.info(f"Campaign {campaign_id} status updated to {status}")

            # Sync local database immediately
            if db:
                db.execute(
                    text("UPDATE dim_campaign SET campaign_status = :status WHERE campaign_id = :id"),
                    {"status": status, "id": int(campaign_id)}
                )
                db.commit()
                logger.info(f"Local DB synced for campaign {campaign_id}")

            return {"status": "success", "campaign_id": campaign_id, "new_status": status}
        except Exception as e:
            logger.error(f"Failed to update campaign {campaign_id} status: {str(e)}")
            raise

    def update_adset_status(self, adset_id: str, status: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Pause or activate an ad set.
        Args:
            adset_id: Facebook ad set ID
            status: 'PAUSED' or 'ACTIVE'
            db: Optional database session for immediate local sync
        """
        try:
            logger.info(f"Updating adset {adset_id} status to {status}")
            adset = AdSet(adset_id)
            adset.api_update(params={AdSet.Field.status: status})
            logger.info(f"AdSet {adset_id} status updated to {status}")

            # Sync local database immediately
            if db:
                db.execute(
                    text("UPDATE dim_adset SET adset_status = :status WHERE adset_id = :id"),
                    {"status": status, "id": int(adset_id)}
                )
                db.commit()
                logger.info(f"Local DB synced for adset {adset_id}")

            return {"status": "success", "adset_id": adset_id, "new_status": status}
        except Exception as e:
            logger.error(f"Failed to update adset {adset_id} status: {str(e)}")
            raise

    def update_ad_status(self, ad_id: str, status: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Pause or activate an ad.
        Args:
            ad_id: Facebook ad ID
            status: 'PAUSED' or 'ACTIVE'
            db: Optional database session for immediate local sync
        """
        try:
            logger.info(f"Updating ad {ad_id} status to {status}")
            ad = Ad(ad_id)
            ad.api_update(params={Ad.Field.status: status})
            logger.info(f"Ad {ad_id} status updated to {status}")

            # Sync local database immediately
            if db:
                db.execute(
                    text("UPDATE dim_ad SET ad_status = :status WHERE ad_id = :id"),
                    {"status": status, "id": int(ad_id)}
                )
                db.commit()
                logger.info(f"Local DB synced for ad {ad_id}")

            return {"status": "success", "ad_id": ad_id, "new_status": status}
        except Exception as e:
            logger.error(f"Failed to update ad {ad_id} status: {str(e)}")
            raise

    def update_adset_budget(self, adset_id: str, daily_budget_cents: int) -> Dict[str, Any]:
        """
        Update daily budget for an ad set (ABO campaigns).
        Args:
            adset_id: Facebook ad set ID
            daily_budget_cents: Budget in cents (e.g., 1000 = $10.00)
        """
        try:
            logger.info(f"Updating adset {adset_id} budget to {daily_budget_cents} cents")
            adset = AdSet(adset_id)
            adset.api_update(params={AdSet.Field.daily_budget: daily_budget_cents})
            logger.info(f"AdSet {adset_id} budget updated to {daily_budget_cents} cents")
            return {"status": "success", "adset_id": adset_id, "new_budget_cents": daily_budget_cents}
        except Exception as e:
            logger.error(f"Failed to update adset {adset_id} budget: {str(e)}")
            raise

    def update_campaign_budget(self, campaign_id: str, daily_budget_cents: int) -> Dict[str, Any]:
        """
        Update daily budget for a campaign (CBO campaigns).
        Args:
            campaign_id: Facebook campaign ID
            daily_budget_cents: Budget in cents (e.g., 1000 = $10.00)
        """
        try:
            logger.info(f"Updating campaign {campaign_id} budget to {daily_budget_cents} cents")
            campaign = Campaign(campaign_id)
            campaign.api_update(params={Campaign.Field.daily_budget: daily_budget_cents})
            logger.info(f"Campaign {campaign_id} budget updated to {daily_budget_cents} cents")
            return {"status": "success", "campaign_id": campaign_id, "new_budget_cents": daily_budget_cents}
        except Exception as e:
            logger.error(f"Failed to update campaign {campaign_id} budget: {str(e)}")
            raise

    def get_campaign_budgets(self, campaign_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch budget info for multiple campaigns from Facebook API.
        Returns dict mapping campaign_id to budget info.
        """
        result = {}
        for campaign_id in campaign_ids:
            try:
                campaign = Campaign(campaign_id)
                fields = [Campaign.Field.daily_budget, Campaign.Field.lifetime_budget]
                data = campaign.api_get(fields=fields)

                daily_budget = data.get(Campaign.Field.daily_budget)
                lifetime_budget = data.get(Campaign.Field.lifetime_budget)

                # CBO campaigns have daily_budget set at campaign level
                is_cbo = daily_budget is not None and int(daily_budget) > 0

                result[campaign_id] = {
                    "daily_budget_cents": int(daily_budget) if daily_budget else None,
                    "lifetime_budget_cents": int(lifetime_budget) if lifetime_budget else None,
                    "is_cbo": is_cbo
                }
            except Exception as e:
                logger.warning(f"Failed to fetch budget for campaign {campaign_id}: {str(e)}")
                result[campaign_id] = {"daily_budget_cents": None, "lifetime_budget_cents": None, "is_cbo": False}

        return result

    def get_adset_budgets(self, adset_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch budget info for multiple ad sets from Facebook API.
        Returns dict mapping adset_id to budget info.
        """
        result = {}
        for adset_id in adset_ids:
            try:
                adset = AdSet(adset_id)
                fields = [AdSet.Field.daily_budget, AdSet.Field.lifetime_budget]
                data = adset.api_get(fields=fields)

                daily_budget = data.get(AdSet.Field.daily_budget)
                lifetime_budget = data.get(AdSet.Field.lifetime_budget)

                result[adset_id] = {
                    "daily_budget_cents": int(daily_budget) if daily_budget else None,
                    "lifetime_budget_cents": int(lifetime_budget) if lifetime_budget else None
                }
            except Exception as e:
                logger.warning(f"Failed to fetch budget for adset {adset_id}: {str(e)}")
                result[adset_id] = {"daily_budget_cents": None, "lifetime_budget_cents": None}

        return result

    # --- Edit Methods ---

    def update_adset_targeting(self, adset_id: str, request: Any) -> Dict[str, Any]:
        """
        Update ad set targeting (locations, age range, budget).
        Only updates fields that are provided (not None).
        """
        try:
            logger.info(f"Updating adset {adset_id} targeting")
            adset = AdSet(adset_id)

            update_params = {}

            # Fetch existing adset data including DSA fields (required for EU compliance)
            existing = adset.api_get(fields=[
                AdSet.Field.targeting,
                AdSet.Field.dsa_beneficiary,
                AdSet.Field.dsa_payor
            ])
            existing_targeting = existing.get(AdSet.Field.targeting, {})

            # Preserve DSA fields if they exist (required for EU ad accounts)
            dsa_beneficiary = existing.get(AdSet.Field.dsa_beneficiary)
            dsa_payor = existing.get(AdSet.Field.dsa_payor)
            if dsa_beneficiary:
                update_params[AdSet.Field.dsa_beneficiary] = dsa_beneficiary
            if dsa_payor:
                update_params[AdSet.Field.dsa_payor] = dsa_payor

            # Update geo_locations if provided
            if request.geo_locations:
                geo_targeting = {}
                countries = []
                regions = []
                cities = []

                for loc in request.geo_locations:
                    if loc.type == "country":
                        countries.append(loc.country_code or loc.key)
                    elif loc.type == "region":
                        regions.append({"key": loc.key})
                    elif loc.type == "city":
                        cities.append({"key": loc.key})

                if countries:
                    geo_targeting["countries"] = countries
                if regions:
                    geo_targeting["regions"] = regions
                if cities:
                    geo_targeting["cities"] = cities

                new_targeting = {
                    "geo_locations": geo_targeting,
                    "age_min": request.age_min or existing_targeting.get("age_min", 18),
                    "age_max": request.age_max or existing_targeting.get("age_max", 65),
                }
                update_params[AdSet.Field.targeting] = new_targeting

            # Update age range if provided (and geo_locations not provided)
            elif request.age_min is not None or request.age_max is not None:
                new_targeting = existing_targeting.copy()
                if request.age_min is not None:
                    new_targeting["age_min"] = request.age_min
                if request.age_max is not None:
                    new_targeting["age_max"] = request.age_max
                update_params[AdSet.Field.targeting] = new_targeting

            # Update budget if provided
            if request.daily_budget_cents is not None:
                update_params[AdSet.Field.daily_budget] = request.daily_budget_cents

            if update_params:
                adset.api_update(params=update_params)
                logger.info(f"AdSet {adset_id} targeting updated successfully")

            return {"status": "success", "adset_id": adset_id}
        except Exception as e:
            logger.error(f"Failed to update adset {adset_id} targeting: {str(e)}")
            raise

    def update_ad_creative(self, ad_id: str, request: Any) -> Dict[str, Any]:
        """
        Update an ad's creative by creating a new creative and linking it.
        Facebook doesn't allow editing creatives, so we create a new one.
        """
        try:
            logger.info(f"Updating ad {ad_id} creative")

            # Get the ad to find its account
            ad = Ad(ad_id)
            ad_data = ad.api_get(fields=[Ad.Field.account_id, Ad.Field.creative])
            account_id = ad_data.get(Ad.Field.account_id)
            old_creative_id = ad_data.get(Ad.Field.creative, {}).get('id')

            # If no new content provided, nothing to do
            if not any([request.title, request.body, request.call_to_action,
                       request.image_hash, request.video_id, request.link_url, request.lead_form_id]):
                return {"status": "no_changes", "ad_id": ad_id}

            # Fetch old creative to get existing values
            old_spec = {}
            old_link_data = {}
            old_creative_type = 'link_data'  # default

            if old_creative_id:
                old_creative = AdCreative(old_creative_id)
                old_data = old_creative.api_get(fields=[
                    AdCreative.Field.name,
                    AdCreative.Field.object_story_spec
                ])
                old_spec = old_data.get(AdCreative.Field.object_story_spec, {})

                # Detect creative type and get the right data
                if 'template_data' in old_spec:
                    old_creative_type = 'template_data'
                    old_link_data = old_spec.get('template_data', {})
                elif 'video_data' in old_spec:
                    old_creative_type = 'video_data'
                    old_link_data = old_spec.get('video_data', {})
                else:
                    old_creative_type = 'link_data'
                    old_link_data = old_spec.get('link_data', {})

                logger.info(f"Old creative type: {old_creative_type}, data keys: {old_link_data.keys() if old_link_data else 'None'}")

            # Build new creative with merged values
            account = AdAccount(f"act_{request.account_id}")

            # Determine lead form ID (location varies by creative type)
            lead_form_id = request.lead_form_id or old_link_data.get('lead_gen_form_id')
            # For video_data, lead form is nested in call_to_action.value
            if old_creative_type == 'video_data' and not lead_form_id:
                cta = old_link_data.get('call_to_action', {})
                lead_form_id = cta.get('value', {}).get('lead_gen_form_id')

            if old_creative_type == 'video_data':
                # Video creative - must use video_data structure, NOT template_data
                old_cta = old_link_data.get('call_to_action', {})
                cta_type = request.call_to_action or old_cta.get('type', 'LEARN_MORE')

                new_spec = {
                    "page_id": request.page_id,
                    "video_data": {
                        "message": request.body or old_link_data.get('message', ''),
                        "title": request.title or old_link_data.get('title', ''),
                        "video_id": request.video_id or old_link_data.get('video_id'),
                        "call_to_action": {
                            "type": cta_type,
                            "value": {}
                        }
                    }
                }
                # Add lead form in call_to_action.value (required for video lead ads)
                if lead_form_id:
                    new_spec["video_data"]["call_to_action"]["value"]["lead_gen_form_id"] = lead_form_id
                    # Facebook requires a link even for lead forms
                    new_spec["video_data"]["call_to_action"]["value"]["link"] = old_cta.get('value', {}).get('link', 'http://fb.me/')
                elif request.link_url or old_cta.get('value', {}).get('link'):
                    link_val = str(request.link_url) if request.link_url else old_cta.get('value', {}).get('link', '')
                    new_spec["video_data"]["call_to_action"]["value"]["link"] = link_val

                # Preserve image_hash (thumbnail)
                if old_link_data.get('image_hash'):
                    new_spec["video_data"]["image_hash"] = old_link_data['image_hash']

                # Copy instagram_user_id if present in old spec
                if old_spec.get('instagram_user_id'):
                    new_spec["instagram_user_id"] = old_spec['instagram_user_id']

            elif old_creative_type == 'template_data' or lead_form_id:
                # Lead form / template creative structure (non-video)
                new_spec = {
                    "page_id": request.page_id,
                    "template_data": {
                        "description": request.body or old_link_data.get('description', '') or old_link_data.get('message', ''),
                        "name": request.title or old_link_data.get('name', '') or old_link_data.get('title', ''),
                        "call_to_action": {"type": request.call_to_action or old_link_data.get('call_to_action', {}).get('type', 'LEARN_MORE')}
                    }
                }
                # Add link if present
                link_value = str(request.link_url) if request.link_url else old_link_data.get('link', '')
                if link_value:
                    new_spec["template_data"]["link"] = link_value

                # Add lead form if present
                if lead_form_id:
                    new_spec["template_data"]["lead_gen_form_id"] = lead_form_id

                # Add media
                if request.image_hash:
                    new_spec["template_data"]["image_hash"] = request.image_hash
                elif request.video_id:
                    new_spec["template_data"]["video_id"] = request.video_id
                elif old_link_data.get('image_hash'):
                    new_spec["template_data"]["image_hash"] = old_link_data['image_hash']
                elif old_link_data.get('video_id'):
                    new_spec["template_data"]["video_id"] = old_link_data['video_id']
            else:
                # Standard link creative structure - requires a link
                link_value = str(request.link_url) if request.link_url else old_link_data.get('link', '')
                if not link_value:
                    raise ValueError("Link URL is required for link ads. Please provide a website URL.")

                new_spec = {
                    "page_id": request.page_id,
                    "link_data": {
                        "message": request.body or old_link_data.get('message', ''),
                        "link": link_value,
                        "name": request.title or old_link_data.get('name', ''),
                        "call_to_action": {"type": request.call_to_action or old_link_data.get('call_to_action', {}).get('type', 'LEARN_MORE')}
                    }
                }
                # Add media
                if request.image_hash:
                    new_spec["link_data"]["image_hash"] = request.image_hash
                elif request.video_id:
                    new_spec["link_data"]["video_id"] = request.video_id
                elif old_link_data.get('image_hash'):
                    new_spec["link_data"]["image_hash"] = old_link_data['image_hash']
                elif old_link_data.get('video_id'):
                    new_spec["link_data"]["video_id"] = old_link_data['video_id']

            creative_params = {
                AdCreative.Field.name: f"Updated Creative - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                AdCreative.Field.object_story_spec: new_spec
            }

            logger.info(f"Creating new AdCreative with spec: {new_spec}")
            new_creative = account.create_ad_creative(params=creative_params)
            new_creative_id = new_creative[AdCreative.Field.id]

            # Update ad to use new creative
            ad.api_update(params={Ad.Field.creative: {"creative_id": new_creative_id}})
            logger.info(f"Ad {ad_id} updated with new creative {new_creative_id}")

            return {
                "status": "success",
                "ad_id": ad_id,
                "new_creative_id": new_creative_id,
                "old_creative_id": old_creative_id
            }
        except Exception as e:
            logger.error(f"Failed to update ad {ad_id} creative: {str(e)}")
            raise

    def get_adset_targeting(self, adset_id: str) -> Dict[str, Any]:
        """
        Fetch current targeting settings for an ad set from Facebook API.
        Returns geo_locations, age_min, age_max.
        """
        try:
            logger.info(f"Fetching targeting for adset {adset_id}")
            adset = AdSet(adset_id)
            data = adset.api_get(fields=[AdSet.Field.targeting])

            # Export data to dict for proper access
            raw_data = data.export_all_data() if hasattr(data, 'export_all_data') else dict(data)
            logger.info(f"Raw targeting data for adset {adset_id}: {raw_data}")

            targeting = raw_data.get("targeting", {})

            # Parse geo_locations into a simpler format
            geo_locations = targeting.get("geo_locations", {})
            locations = []

            # Countries
            for country_code in geo_locations.get("countries", []):
                locations.append({
                    "key": country_code,
                    "type": "country",
                    "name": country_code,
                    "country_code": country_code,
                    "display_name": country_code
                })

            # Regions
            for region in geo_locations.get("regions", []):
                locations.append({
                    "key": region.get("key"),
                    "type": "region",
                    "name": region.get("name", ""),
                    "country_code": region.get("country"),
                    "display_name": f"{region.get('name', '')} ({region.get('country', '')})"
                })

            # Cities
            for city in geo_locations.get("cities", []):
                locations.append({
                    "key": city.get("key"),
                    "type": "city",
                    "name": city.get("name", ""),
                    "country_code": city.get("country"),
                    "display_name": f"{city.get('name', '')}, {city.get('region', '')} ({city.get('country', '')})"
                })

            # Custom locations (radius-based targeting)
            for idx, custom_loc in enumerate(geo_locations.get("custom_locations", [])):
                lat = custom_loc.get("latitude")
                lng = custom_loc.get("longitude")
                radius = custom_loc.get("radius", 0)
                unit = custom_loc.get("distance_unit", "mile")
                country = custom_loc.get("country", "")
                locations.append({
                    "key": f"custom_{idx}_{lat}_{lng}",
                    "type": "custom_location",
                    "name": f"{radius} {unit} radius",
                    "country_code": country,
                    "display_name": f"{radius} {unit} radius ({country})"
                })

            result = {
                "locations": locations,
                "age_min": targeting.get("age_min", 18),
                "age_max": targeting.get("age_max", 65)
            }
            logger.info(f"Parsed targeting result for adset {adset_id}: locations={len(locations)}, age_min={result['age_min']}, age_max={result['age_max']}")
            return result
        except Exception as e:
            logger.error(f"Failed to fetch adset {adset_id} targeting: {str(e)}")
            raise

    def get_ad_creative(self, ad_id: str) -> Dict[str, Any]:
        """
        Fetch current creative details for an ad from Facebook API.
        Returns title, body, link_url, call_to_action, lead_form_id, image_url, video_url.
        """
        try:
            logger.info(f"Fetching creative for ad {ad_id}")
            ad = Ad(ad_id)
            ad_data = ad.api_get(fields=[Ad.Field.creative])
            creative_ref = ad_data.get(Ad.Field.creative, {})
            creative_id = creative_ref.get('id')

            if not creative_id:
                logger.warning(f"No creative ID found for ad {ad_id}")
                return {}

            creative = AdCreative(creative_id)
            creative_data = creative.api_get(fields=[
                AdCreative.Field.object_story_spec,
                AdCreative.Field.thumbnail_url,
                AdCreative.Field.title,
                AdCreative.Field.body,
                AdCreative.Field.link_url
            ])

            logger.info(f"Creative data for ad {ad_id}: {creative_data}")

            spec = creative_data.get(AdCreative.Field.object_story_spec, {})

            # Try different data structures - link_data, template_data, or video_data
            link_data = spec.get('link_data', {}) or spec.get('template_data', {}) or spec.get('video_data', {}) or {}

            logger.info(f"Link data for ad {ad_id}: {link_data}")

            # Get image/video URL
            image_url = None
            video_url = None
            if link_data.get('picture'):
                image_url = link_data.get('picture')
            elif creative_data.get(AdCreative.Field.thumbnail_url):
                image_url = creative_data.get(AdCreative.Field.thumbnail_url)

            # Get CTA type
            cta = link_data.get('call_to_action', {})
            cta_type = cta.get('type', 'LEARN_MORE') if isinstance(cta, dict) else 'LEARN_MORE'

            # Try multiple field names for title/body/link
            title = (
                link_data.get('name', '') or
                link_data.get('title', '') or
                creative_data.get(AdCreative.Field.title, '') or
                ''
            )
            body = (
                link_data.get('message', '') or
                link_data.get('description', '') or
                creative_data.get(AdCreative.Field.body, '') or
                ''
            )
            link_url = (
                link_data.get('link', '') or
                creative_data.get(AdCreative.Field.link_url, '') or
                ''
            )

            return {
                "title": title,
                "body": body,
                "link_url": link_url,
                "call_to_action": cta_type,
                "lead_form_id": link_data.get('lead_gen_form_id', ''),
                "image_url": image_url,
                "video_url": video_url
            }
        except Exception as e:
            logger.error(f"Failed to fetch ad {ad_id} creative: {str(e)}")
            raise
