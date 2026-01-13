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
        adset_params = {
            AdSet.Field.name: f"{request.campaign_name} - AdSet",
            AdSet.Field.campaign_id: campaign_id,
            AdSet.Field.status: AdSet.Status.paused,
            AdSet.Field.daily_budget: request.daily_budget_cents,
            AdSet.Field.billing_event: "IMPRESSIONS",
            # Targeting with geo_locations
            AdSet.Field.targeting: {
                "geo_locations": geo_targeting,
                "age_min": request.age_min,
                "age_max": request.age_max,
            },
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
        ad_params = {
            Ad.Field.name: f"{request.campaign_name} - Ad",
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
        ad_params = {
            Ad.Field.name: f"Ad - {request.creative.title[:20]}",
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
