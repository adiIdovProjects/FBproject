"""
extractors/fb_api.py - Facebook API Data Extractor

This module handles all interactions with the Facebook Marketing API.
Includes retry logic, rate limit handling, and parallel processing.
"""

import pandas as pd
import os
import time
import logging
import json
from typing import List, Dict, Any
from datetime import date, timedelta
import concurrent.futures

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.advideo import AdVideo
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.exceptions import FacebookRequestError

# Import config
try:
    from config.settings import BASE_FIELDS_TO_PULL, CHUNK_DAYS
except ImportError:
    BASE_FIELDS_TO_PULL = []
    CHUNK_DAYS = 7

logger = logging.getLogger(__name__)

# Constants - Multi-Agent Configuration
MAX_RETRIES = 5
BASE_SLEEP_TIME = 2
MAX_WORKERS = 5            # For insights pull (bulk data)
META_MAX_WORKERS = 1       # Sequential metadata fetch to avoid account-level rate limits


class FacebookExtractor:
    """Facebook Marketing API data extractor"""
    
    def __init__(self):
        self.account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.initialized = False
        self.logger = logging.getLogger(self.__class__.__name__)
        self._video_cache = {}  # Cache for AdVideo data
        self._failed_video_ids = set() # Cache for video IDs with permission errors
    
    def initialize(self) -> bool:
        """Initialize connection to Facebook API"""

        if not all([self.account_id, self.access_token, self.app_id, self.app_secret]):
            self.logger.error("Missing Facebook API credentials")
            return False

        try:
            FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
            self.initialized = True
            self.logger.info(f"✅ Facebook API initialized for account {self.account_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize Facebook API: {e}")
            return False

    def get_account_info(self) -> Dict[str, Any]:
        """
        Fetch account information including currency from Facebook API

        Returns:
            Dictionary with account_id, account_name, and currency
        """
        if not self.initialized:
            self.logger.error("Facebook API not initialized")
            return {}

        try:
            # Ensure account_id has 'act_' prefix for API calls
            account_id_with_prefix = f"act_{self.account_id}" if not str(self.account_id).startswith('act_') else str(self.account_id)

            account = AdAccount(account_id_with_prefix)
            account_data = account.api_get(fields=['id', 'name', 'currency', 'account_status'])

            result = {
                'account_id': str(account_data.get('id', self.account_id)).replace('act_', ''),
                'account_name': account_data.get('name', f'Account {self.account_id}'),
                'currency': account_data.get('currency', 'USD'),
                'account_status': account_data.get('account_status', 'UNKNOWN')
            }

            self.logger.info(f"✅ Fetched account info: {result['account_name']} ({result['currency']})")
            return result

        except Exception as e:
            self.logger.error(f"Failed to fetch account info: {e}")
            # Return default values
            return {
                'account_id': str(self.account_id).replace('act_', ''),
                'account_name': f'Account {self.account_id}',
                'currency': 'USD',
                'account_status': 'UNKNOWN'
            }

    def get_core_data(self, start_date: date, end_date: date) -> pd.DataFrame:
        """Extract core campaign data (no breakdowns)"""
        if not self.initialized:
            self.logger.error("Facebook API not initialized")
            return pd.DataFrame()
        
        self.logger.info(f"Extracting core data from {start_date} to {end_date}...")
        chunks = self._get_date_chunks(start_date, end_date)
        fields = [self._extract_field_name(f) for f in BASE_FIELDS_TO_PULL]

        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(self._fetch_chunk, chunk, fields, []): chunk
                for chunk in chunks
            }
            
            for future in concurrent.futures.as_completed(futures):
                chunk = futures[future]
                try:
                    data, success, count = future.result()
                    if success:
                        all_data.extend(data)
                except Exception as e:
                    self.logger.error(f"Error fetching chunk {chunk['index']}: {e}")
        
        if not all_data:
            return pd.DataFrame()

        df = pd.DataFrame(all_data)
        
        # תיקון: הבטחת מזהים כסטרינג מיד עם הטעינה הראשונית
        for col in df.columns:
            if col.endswith('_id'):
                df[col] = df[col].astype(str).str.strip()
                
        return df
    
    def get_breakdown_data(self, breakdowns: List[str], start_date: date, end_date: date) -> pd.DataFrame:
        """Extract data with breakdowns"""
        if not self.initialized:
            return pd.DataFrame()
        
        chunks = self._get_date_chunks(start_date, end_date)
        fields = [self._extract_field_name(f) for f in BASE_FIELDS_TO_PULL]
        
        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(self._fetch_chunk, chunk, fields, breakdowns): chunk
                for chunk in chunks
            }
            for future in concurrent.futures.as_completed(futures):
                try:
                    data, success, count = future.result()
                    if success:
                        all_data.extend(data)
                except Exception as e:
                    self.logger.error(f"Error fetching breakdown chunk: {e}")
        
        if not all_data:
            return pd.DataFrame()
        
        df = pd.DataFrame(all_data)
        # תיקון: הבטחת מזהים כסטרינג
        for col in df.columns:
            if col.endswith('_id'):
                df[col] = df[col].astype(str).str.strip()
                
        return df
    
    def _fetch_with_retry(self, func, *args, **kwargs):
        """Helper to fetch from API with retry and backoff"""
        # More patient for metadata
        max_attempts = kwargs.pop('max_attempts', 5)
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == max_attempts - 1:
                    self.logger.error(f"Final attempt failed: {e}")
                    raise
                
                # Check for rate limit (80004 or 17)
                err_str = str(e).lower()
                is_rate_limit = "80004" in err_str or "17" in err_str or "rate limit" in err_str or "too many calls" in err_str
                
                # Exponential backoff: 30s, 60s, 120s, 240s
                sleep_time = (2 ** attempt) * 30 if is_rate_limit else (attempt + 1) * 10
                
                if is_rate_limit:
                    self.logger.warning(f"Rate limit hit! Sleeping {sleep_time}s before retry {attempt + 2}/{max_attempts}...")
                else:
                    self.logger.warning(f"Fetch failed: {e}. Retrying in {sleep_time}s...")
                
                time.sleep(sleep_time)
        return None

    def get_metadata(self, df_core: pd.DataFrame) -> pd.DataFrame:
        """Extract campaign/adset/ad metadata (names, statuses) in bulk"""
        if df_core.empty or not self.initialized:
            return pd.DataFrame()

        self.logger.info(f"Extracting metadata for {len(df_core)} rows...")
        
        try:
            FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
            
            # Hybrid Strategy:
            # If we have few unique IDs, use targeted fetching (faster, avoids account-wide rate limits)
            # If we have many IDs, use account-level bulk fetching (more efficient for huge accounts)
            unique_ad_ids = df_core['ad_id'].unique().tolist()
            
            if len(unique_ad_ids) < 100:
                self.logger.info(f"Targeted Fetch: Looking up metadata for {len(unique_ad_ids)} specific Ads.")
                
                parts = []
                # 1. Fetch campaigns (only those in core)
                campaign_ids = [cid for cid in df_core['campaign_id'].unique().tolist() if cid and cid != '0']
                if campaign_ids:
                    parts.append(self._get_entity_metadata(campaign_ids, 'campaign'))
                
                # 2. Fetch adsets
                adset_ids = [sid for sid in df_core['adset_id'].unique().tolist() if sid and sid != '0']
                if adset_ids:
                    parts.append(self._get_entity_metadata(adset_ids, 'adset'))
                
                # 3. Fetch ads
                if unique_ad_ids:
                    parts.append(self._get_entity_metadata(unique_ad_ids, 'ad'))
                
                df_meta = pd.concat([p for p in parts if not p.empty], axis=0, ignore_index=True)
                
            else:
                self.logger.info("Bulk Fetch: Extracting everything from account level...")
                account = AdAccount(f'act_{self.account_id}')
                meta_parts = []
                all_statuses = ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']
                filtering = [{'field': 'effective_status', 'operator': 'IN', 'value': all_statuses}]

                # 1. Campaigns
                campaigns = self._fetch_with_retry(
                    account.get_campaigns,
                    fields=[Campaign.Field.id, Campaign.Field.name, Campaign.Field.status, Campaign.Field.objective],
                    params={'filtering': filtering, 'limit': 1000}
                )
                df_c = pd.DataFrame([c.export_all_data() for c in campaigns]) if campaigns else pd.DataFrame()
                if not df_c.empty:
                    df_c.rename(columns={'id': 'campaign_id', 'name': 'campaign_name', 'status': 'campaign_status'}, inplace=True)
                    meta_parts.append(df_c)

                # 2. Adsets
                adsets = self._fetch_with_retry(
                    account.get_ad_sets,
                    fields=[AdSet.Field.id, AdSet.Field.name, AdSet.Field.status, AdSet.Field.campaign_id, AdSet.Field.targeting],
                    params={'filtering': filtering, 'limit': 1000}
                )
                df_s = pd.DataFrame([s.export_all_data() for s in adsets]) if adsets else pd.DataFrame()
                if not df_s.empty:
                    df_s.rename(columns={'id': 'adset_id', 'name': 'adset_name', 'status': 'adset_status'}, inplace=True)
                    meta_parts.append(df_s)
                
                # 3. Ads
                ads = self._fetch_with_retry(
                    account.get_ads,
                    fields=[Ad.Field.id, Ad.Field.name, Ad.Field.status, Ad.Field.adset_id, Ad.Field.creative],
                    params={'filtering': filtering, 'limit': 1000}
                )
                if ads:
                    df_a = pd.DataFrame([a.export_all_data() for a in ads])
                    def extract_creative_id(row):
                        creative = row.get('creative')
                        if isinstance(creative, dict): return str(creative.get('id', ''))
                        return None
                    df_a['creative_id'] = df_a.apply(extract_creative_id, axis=1)
                    df_a.rename(columns={'id': 'ad_id', 'name': 'ad_name', 'status': 'ad_status'}, inplace=True)
                    meta_parts.append(df_a)

                df_meta = pd.concat(meta_parts, axis=0, ignore_index=True) if meta_parts else pd.DataFrame()
            
            # Clean up all ID columns to strings for final output consistency
            for col in df_meta.columns:
                if col.endswith('_id'):
                    df_meta[col] = df_meta[col].astype(str).replace(['nan', 'None', ''], '0').str.strip()
                    
            return df_meta

        except Exception as e:
            self.logger.error(f"Failed bulk metadata extraction: {e}")
            return pd.DataFrame()
    
    def get_creative_details(self, creative_ids: List[str]) -> pd.DataFrame:
        """Extract creative details"""
        if not creative_ids or not self.initialized:
            return pd.DataFrame()
        
        unique_ids = list(set(str(x).strip() for x in creative_ids if pd.notna(x) and str(x).strip() not in ['0', '0.0', '', 'None', 'nan']))
        fields = [
            AdCreative.Field.id, AdCreative.Field.name, AdCreative.Field.title,
            AdCreative.Field.body, AdCreative.Field.call_to_action_type, 
            AdCreative.Field.image_url, AdCreative.Field.thumbnail_url,
            AdCreative.Field.video_id, 'asset_feed_spec', 'object_story_spec'
        ]
        
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=META_MAX_WORKERS) as executor:
            futures = {executor.submit(self._fetch_creative, cid, fields): cid for cid in unique_ids}
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result: results.append(result)
        
        if not results: return pd.DataFrame()
        
        df = pd.DataFrame(results)
        df.rename(columns={'id': 'creative_id'}, inplace=True)
        # שמירה על creative_id כסטרינג
        df['creative_id'] = df['creative_id'].astype(str)
        return df

    def _fetch_all_videos(self) -> Dict[str, Dict]:
        """Fetch all videos for the account and cache them using paging with retries"""
        if not self.initialized: return {}
        if self._video_cache: return self._video_cache

        self.logger.info("Fetching all videos for account to build cache...")
        try:
            FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
            account = AdAccount(f'act_{self.account_id}')
            
            # Use smaller limit to avoid 500 errors
            fields = [AdVideo.Field.id, AdVideo.Field.source, AdVideo.Field.length]
            
            # Initial fetch with retry
            videos = self._fetch_with_retry(account.get_ad_videos, fields=fields, params={'limit': 100})
            
            if not videos: return {}

            count = 0
            while True:
                for v in videos:
                    vid = str(v.get('id'))
                    self._video_cache[vid] = {
                        'video_url': v.get('source'),
                        'video_length_seconds': int(float(v.get('length') or 0))
                    }
                    count += 1
                
                # Check for next page
                if 'paging' in videos and 'next' in videos['paging']:
                    # Wrap get_next_page in retry as well
                    videos = self._fetch_with_retry(videos.get_next_page)
                    if not videos: break
                else:
                    break
            
            self.logger.info(f"✅ Cached {len(self._video_cache)} videos.")
            return self._video_cache
        except Exception as e:
            self.logger.error(f"Failed to fetch account videos: {e}")
            return {}

    # ========== PRIVATE METHODS ==========
    
    def _get_date_chunks(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        if start_date > end_date: return []
        
        chunks = []
        current_start = start_date
        idx = 1
        while current_start <= end_date:
            current_end = min(current_start + timedelta(days=CHUNK_DAYS - 1), end_date)
            chunks.append({
                'index': idx,
                'start_date': current_start.strftime('%Y-%m-%d'),
                'end_date': current_end.strftime('%Y-%m-%d')
            })
            current_start = current_end + timedelta(days=1)
            idx += 1
        return chunks
    
    def _fetch_chunk(self, chunk: Dict, fields: List[str], breakdowns: List[str]) -> tuple:
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
        account = AdAccount(f'act_{self.account_id}')
        params = {
            'level': 'ad', 'time_increment': 1, 'limit': 1000,
            'time_range': {'since': chunk['start_date'], 'until': chunk['end_date']},
        }
        if breakdowns: params['breakdowns'] = breakdowns
        
        for attempt in range(MAX_RETRIES):
            try:
                self.logger.info(f"Fetching chunk (Attempt {attempt+1}): {params} with {len(fields)} fields")
                insights = account.get_insights(fields=fields, params=params)
                data = [dict(row) for row in insights]
                self.logger.info(f"Chunk fetched successfully. Rows: {len(data)}")
                return data, True, len(data)
            except FacebookRequestError as e:
                self.logger.error(f"FacebookRequestError on chunk {chunk}: {e}")
                time.sleep(BASE_SLEEP_TIME * (2 ** attempt))
            except Exception as e:
                self.logger.error(f"Unexpected error in _fetch_chunk: {e}", exc_info=True)
                return [], False, 0
        self.logger.error("Max retries reached for chunk")
        return [], False, 0
    
    def _get_entity_metadata(self, entity_ids: List, entity_type: str) -> pd.DataFrame:
        if entity_type == 'campaign':
            entity_class, fields = Campaign, [Campaign.Field.name, Campaign.Field.status, Campaign.Field.objective]
        elif entity_type == 'adset':
            entity_class, fields = AdSet, [AdSet.Field.name, AdSet.Field.status, AdSet.Field.targeting]
        elif entity_type == 'ad':
            entity_class, fields = Ad, [Ad.Field.name, Ad.Field.status, Ad.Field.creative]
        else: return pd.DataFrame()
        
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=META_MAX_WORKERS) as executor:
            futures = {executor.submit(self._fetch_entity, eid, entity_class, fields, entity_type): eid for eid in entity_ids}
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result: results.append(result)
        
        df = pd.DataFrame(results)
        # הבטחת טקסט מיד ביצירת ה-DF הקטן
        id_col = f'{entity_type}_id'
        if not df.empty and id_col in df.columns:
            df[id_col] = df[id_col].astype(str)
        return df
    
    def _fetch_entity(self, entity_id, entity_class, fields: List, entity_type: str) -> Dict:
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
        eid_str = str(entity_id).strip()
        if eid_str in ['', 'nan', '0', '0.0']: return None

        try:
            entity = entity_class(eid_str)
            data = self._fetch_with_retry(entity.api_get, fields=fields)
            if not data: return None
            
            data_exp = data.export_all_data()
            result = {
                f'{entity_type}_id': eid_str,
                f'{entity_type}_name': data_exp.get('name', 'N/A'),
                f'{entity_type}_status': data_exp.get('status', 'N/A'),
            }
            if entity_type == 'campaign': result['objective'] = data_exp.get('objective')
            elif entity_type == 'adset':
                result['targeting'] = data_exp.get('targeting')
            elif entity_type == 'ad':
                creative = data_exp.get('creative')
                if creative and isinstance(creative, dict):
                    result['creative_id'] = str(creative.get('id', ''))
            return result
        except Exception as e:
            self.logger.error(f"Error fetching {entity_type} {entity_id}: {e}")
            return None

    def _fetch_creative(self, creative_id: str, fields: List) -> Dict:
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
        cid_str = str(creative_id).strip()
        try:
            creative = AdCreative(cid_str)
            data = self._fetch_with_retry(creative.api_get, fields=fields)
            if not data: return None
            
            data_exp = data.export_all_data()
            result = {
                'id': cid_str,
                'title': data_exp.get('title', '')[:255],
                'body': data_exp.get('body', '')[:500],
                'call_to_action_type': data_exp.get('call_to_action_type'),
                'image_url': data_exp.get('image_url') or data_exp.get('thumbnail_url'),
                'video_id': data_exp.get('video_id'),
                'is_video': bool(data_exp.get('video_id')),
                'asset_feed_spec': data_exp.get('asset_feed_spec'),
                'object_story_spec': data_exp.get('object_story_spec'),
            }

            # Extract Video ID from specs if missing at top level
            if not result.get('video_id'):
                # Check asset_feed_spec
                if result.get('asset_feed_spec') and isinstance(result['asset_feed_spec'], dict):
                    videos = result['asset_feed_spec'].get('videos', [])
                    if videos and isinstance(videos, list) and len(videos) > 0:
                        result['video_id'] = videos[0].get('video_id')
                
                # Check object_story_spec
                if not result.get('video_id') and result.get('object_story_spec') and isinstance(result['object_story_spec'], dict):
                    oss = result['object_story_spec']
                    video_data = oss.get('video_data')
                    if video_data and isinstance(video_data, dict):
                        result['video_id'] = video_data.get('video_id')
            
            # Fetch video details from cache if it's a video
            video_id = result.get('video_id')
            if video_id:
                vid_str = str(video_id)
                result['is_video'] = True
                
                # Default Fallback URL
                result['video_url'] = f"https://www.facebook.com/watch/?v={vid_str}"

                # Skip if we already know this video has permission issues
                if vid_str in self._failed_video_ids:
                    return result

                # Ensure cache is populated
                cache = self._fetch_all_videos()
                video_data = cache.get(vid_str)
                if video_data:
                    # Clear fallback if we have real source
                    if video_data.get('video_url'):
                        result.update(video_data)
                else:
                    # Fallback: Try fetching single video if not in cache
                    try:
                        video = AdVideo(vid_str).api_get(fields=[AdVideo.Field.source, AdVideo.Field.length])
                        real_url = video.get('source')
                        if real_url:
                            result['video_url'] = real_url
                        result['video_length_seconds'] = int(float(video.get('length') or 0))
                        # Update cache for this ID to avoid repeated individual fetches
                        self._video_cache[vid_str] = {
                            'video_url': result['video_url'],
                            'video_length_seconds': result['video_length_seconds']
                        }
                    except Exception as ve:
                        # Check for permission error (#10)
                        err_msg = str(ve)
                        if "(#10)" in err_msg or "permission" in err_msg.lower():
                            # Don't log as error, just mark as failed and keep fallback URL
                            self._failed_video_ids.add(vid_str)
                        else:
                            self.logger.warning(f"Individual fetch failed for video {vid_str}: {ve}")
            
            return result
        except Exception as e:
            self.logger.error(f"Error fetching creative {creative_id}: {e}")
            return None
    
    @staticmethod
    def _extract_field_name(field) -> str:
        if hasattr(field, 'value'): return field.value
        return str(field).split('.')[-1] if '.' in str(field) else str(field)