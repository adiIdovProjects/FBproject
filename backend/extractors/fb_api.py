"""
extractors/fb_api.py - Facebook API Data Extractor (Optimized & Robust)

This module handles all interactions with the Facebook Marketing API.
Includes:
- Batch fetching for metadata/creatives (50x speedup)
- Robust retry logic and fallbacks for "poisonous" IDs
- Rate limit handling
- Parallel processing
"""

import pandas as pd
import os
import time
import logging
import json
from typing import List, Dict, Any, Union
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
from backend.config.settings import BASE_FIELDS_TO_PULL, CHUNK_DAYS
from backend.config.base_config import settings

logger = logging.getLogger(__name__)

# Constants - Optimized Configuration
MAX_RETRIES = 5
BASE_SLEEP_TIME = 2
MAX_WORKERS = 10           # Increased from 5: Core insights (bulk data)
META_MAX_WORKERS = 10      # Increased from 1: Metadata parallel fetching
BATCH_SIZE = 50            # optimal batch size for FB graph API ID lookups
BATCH_TIMEOUT = 45         # Seconds before giving up on a batch
BULK_FETCH_THRESHOLD = 2000 # Only dump full account if we need > 2000 IDs


class FacebookExtractor:
    """Facebook Marketing API data extractor"""
    
    def __init__(self, access_token: str = None, account_id: str = None, user_id: int = None):
        """
        Initialize Facebook extractor

        Args:
            access_token: User's Facebook access token (optional, defaults to .env)
            account_id: Facebook ad account ID (optional, defaults to .env)
            user_id: User ID for tracking (optional)
        """
        # Use provided tokens or fall back to .env credentials
        self.account_id = account_id or settings.FACEBOOK_AD_ACCOUNT_ID
        self.access_token = access_token or settings.FACEBOOK_ACCESS_TOKEN
        self.app_id = settings.FACEBOOK_APP_ID
        self.app_secret = settings.FACEBOOK_APP_SECRET
        self.user_id = user_id
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
        """
        if not self.initialized:
            self.logger.error("Facebook API not initialized")
            return {}

        try:
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
            return {
                'account_id': str(self.account_id).replace('act_', ''),
                'account_name': f'Account {self.account_id}',
                'currency': 'USD',
                'account_status': 'UNKNOWN'
            }

    def get_core_data(self, start_date: date, end_date: date) -> pd.DataFrame:
        """Extract core campaign data (no breakdowns)"""
        if not self.initialized: return pd.DataFrame()
        
        self.logger.info(f"[{self.account_id}] Extracting core data from {start_date} to {end_date}...")
        chunks = self._get_date_chunks(start_date, end_date)
        self.logger.info(f"[{self.account_id}] Split date range into {len(chunks)} chunks of {CHUNK_DAYS} days.")
        fields = [self._extract_field_name(f) for f in BASE_FIELDS_TO_PULL]

        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(self._fetch_chunk, chunk, fields, [], len(chunks)): chunk
                for chunk in chunks
            }
            
            for future in concurrent.futures.as_completed(futures):
                chunk = futures[future]
                try:
                    data, success, count = future.result()
                    if success:
                        all_data.extend(data)
                except Exception as e:
                    self.logger.error(f"[{self.account_id}] Error fetching chunk {chunk['index']}/{len(chunks)} ({chunk['start_date']} to {chunk['end_date']}): {e}")
        
        self.logger.info(f"[{self.account_id}] Completed core data extraction. Total chunks: {len(chunks)}. Total records: {len(all_data)}")
        if not all_data: return pd.DataFrame()

        df = pd.DataFrame(all_data)
        
        # Ensure IDs are strings immediately
        for col in df.columns:
            if col.endswith('_id'):
                df[col] = df[col].astype(str).str.strip()
                
        return df
    
    def get_breakdown_data(self, breakdowns: List[str], start_date: date, end_date: date) -> pd.DataFrame:
        """Extract data with breakdowns"""
        if not self.initialized: return pd.DataFrame()
        
        chunks = self._get_date_chunks(start_date, end_date)
        fields = [self._extract_field_name(f) for f in BASE_FIELDS_TO_PULL]
        
        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(self._fetch_chunk, chunk, fields, breakdowns, len(chunks)): chunk
                for chunk in chunks
            }
            for future in concurrent.futures.as_completed(futures):
                try:
                    data, success, count = future.result()
                    if success:
                        all_data.extend(data)
                except Exception as e:
                    self.logger.error(f"Error fetching breakdown chunk: {e}")
        
        if not all_data: return pd.DataFrame()
        
        df = pd.DataFrame(all_data)
        # Ensure IDs are strings
        for col in df.columns:
            if col.endswith('_id'):
                df[col] = df[col].astype(str).str.strip()
                
        return df

    def get_metadata(self, df_core: pd.DataFrame) -> pd.DataFrame:
        """Extract campaign/adset/ad metadata (names, statuses) optimized"""
        if df_core.empty or not self.initialized: return pd.DataFrame()

        # Hybrid Strategy:
        # If UNIQUE_IDs < BULK_FETCH_THRESHOLD: Targeted Batch Fetch (Fastest)
        # If UNIQUE_IDs > BULK_FETCH_THRESHOLD: Full Account Dump (More bandwidth, less API calls)
        
        unique_ad_ids = df_core['ad_id'].unique().tolist()
        unique_ad_ids = [str(x) for x in unique_ad_ids if x and str(x) != '0']
        
        count_ids = len(unique_ad_ids)
        
        if count_ids == 0:
            return pd.DataFrame()

        # Re-init for freshness
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)

        if count_ids < BULK_FETCH_THRESHOLD:
            self.logger.info(f"Targeted Fetch: Optimizing metadata pull for {count_ids} Ads (Batch Mode)...")
            
            parts = []
            
            # 1. Campaigns
            campaign_ids = list(set([str(cid) for cid in df_core['campaign_id'].unique() if cid and str(cid) != '0']))
            if campaign_ids:
                fields = [Campaign.Field.name, Campaign.Field.status, Campaign.Field.objective]
                parts.append(self._fetch_by_ids_batch(campaign_ids, Campaign, fields, 'campaign'))
            
            # 2. Adsets
            adset_ids = list(set([str(sid) for sid in df_core['adset_id'].unique() if sid and str(sid) != '0']))
            if adset_ids:
                fields = [AdSet.Field.name, AdSet.Field.status, AdSet.Field.targeting]
                parts.append(self._fetch_by_ids_batch(adset_ids, AdSet, fields, 'adset'))
            
            # 3. Ads
            if unique_ad_ids:
                fields = [Ad.Field.name, Ad.Field.status, Ad.Field.creative]
                parts.append(self._fetch_by_ids_batch(unique_ad_ids, Ad, fields, 'ad'))
            
            df_meta = pd.concat([p for p in parts if not p.empty], axis=0, ignore_index=True)

        else:
            self.logger.info(f"Bulk Fetch: {count_ids} IDs > Threshold {BULK_FETCH_THRESHOLD}. Dumping entire account...")
            df_meta = self._fetch_entire_account_metadata()
        
        # Post-Processing
        if not df_meta.empty:
            for col in df_meta.columns:
                if col.endswith('_id'):
                    df_meta[col] = df_meta[col].astype(str).replace(['nan', 'None', '', '0.0'], '0').str.strip()
        
        return df_meta
    
    def get_creative_details(self, creative_ids: List[str]) -> pd.DataFrame:
        """Extract creative details utilizing Batch Fetching"""
        if not creative_ids or not self.initialized: return pd.DataFrame()
        
        valid_ids = list(set([str(x).strip() for x in creative_ids if x and str(x).strip() not in ['0', '0.0', 'nan', 'None', '']]))
        
        if not valid_ids: return pd.DataFrame()

        self.logger.info(f"Extracting details for {len(valid_ids)} creatives (Batch Mode)...")

        fields = [
            AdCreative.Field.id, AdCreative.Field.name, AdCreative.Field.title,
            AdCreative.Field.body, AdCreative.Field.call_to_action_type, 
            AdCreative.Field.image_url, AdCreative.Field.thumbnail_url,
            AdCreative.Field.video_id, 'asset_feed_spec', 'object_story_spec'
        ]

        # Use the batch fetcher which handles retries and errors internally
        return self._fetch_by_ids_batch(valid_ids, AdCreative, fields, 'creative')

    # ========== OPTIMIZED BATCH FETCHING ==========

    def _fetch_by_ids_batch(self, ids: List[str], entity_class, fields: List[str], entity_type: str) -> pd.DataFrame:
        """
        Robust Batch Fetcher:
        1. Breaks IDs into chunks of 50
        2. Fetches in parallel
        3. Handles timeouts & errors
        4. Falls back to individual fetching if a batch fails (poisonous ID protection)
        """
        if not ids: return pd.DataFrame()
        
        results = []
        chunks = [ids[i:i + BATCH_SIZE] for i in range(0, len(ids), BATCH_SIZE)]
        
        self.logger.info(f"Fetching {entity_type}: {len(ids)} items in {len(chunks)} batches...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=META_MAX_WORKERS) as executor:
            # Prepare futures
            future_to_chunk = {
                executor.submit(self._fetch_single_batch, chunk, entity_class, fields, entity_type): chunk 
                for chunk in chunks
            }

            for future in concurrent.futures.as_completed(future_to_chunk):
                chunk = future_to_chunk[future]
                try:
                    # Timeout is PER BATCH to prevent hanging
                    batch_data = future.result(timeout=BATCH_TIMEOUT)
                    if batch_data:
                        results.extend(batch_data)
                except concurrent.futures.TimeoutError:
                    self.logger.warning(f"Batch timeout for {entity_type} (size {len(chunk)}). Retrying/Falling back...")
                    # Fallback logic here needs to be run directly since we are already inside a future callback
                    # Ideally, re-submit or run sync. For simplicity, run sync fallback.
                    fallback_results = self._fallback_fetch_individually(chunk, entity_class, fields, entity_type)
                    results.extend(fallback_results)
                except Exception as e:
                    self.logger.error(f"Batch failed for {entity_type}: {e}. Falling back to individual.")
                    fallback_results = self._fallback_fetch_individually(chunk, entity_class, fields, entity_type)
                    results.extend(fallback_results)

        df = pd.DataFrame(results)
        
        # Ensure we return a DataFrame even if empty
        if df.empty: return pd.DataFrame()
        
        # Standardize ID column
        id_col = f'{entity_type}_id' if entity_type != 'creative' else 'creative_id'
        if 'id' in df.columns:
            df.rename(columns={'id': id_col}, inplace=True)
            
        if id_col in df.columns:
            df[id_col] = df[id_col].astype(str)
            
        return df

    def _fetch_single_batch(self, batch_ids: List[str], entity_class, fields: List[str], entity_type: str) -> List[Dict]:
        """Fetch a single batch of 50 IDs using the efficient ?ids= endpoint"""
        api = FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
        
        try:
            # Direct API call to avoid SDK module issues
            # Maps to GET /?ids=id1,id2&fields=...
            # This returns a JSON dict: { "id1": { "field": "val" }, "id2": ... }
            
            # Join fields with commas
            fields_str = ','.join(fields)
            ids_str = ','.join(batch_ids)
            
            # The SDK's call method handles the version and graph URL
            response = api.call(
                'GET',
                tuple(), # Path nodes (root)
                {'ids': ids_str, 'fields': fields_str}
            )
            
            objects_dict = response.json()
            
            if not objects_dict:
                return []
            
            parsed_data = []
            for eid, data in objects_dict.items():
                try:
                    # data is already a dict
                    # Ensure ID is in data
                    if 'id' not in data: data['id'] = eid
                    
                    processed = self._process_entity_data(data, entity_type)
                    if processed:
                        parsed_data.append(processed)
                except Exception as inner_e:
                    self.logger.warning(f"Error processing item {eid} in batch: {inner_e}")
                    continue

            return parsed_data

        except Exception as e:
            # Propagate error to trigger fallback in main loop
            raise e

    def _fallback_fetch_individually(self, ids: List[str], entity_class, fields: List[str], entity_type: str) -> List[Dict]:
        """Last resort: Fetch items one by one if batch fails"""
        self.logger.warning(f"⚠️ Falling back to individual fetch for {len(ids)} {entity_type}s")
        results = []
        for i, eid in enumerate(ids):
            try:
                # Simulate mini-batching or just single calls
                # Here we do single call safely
                entity = entity_class(eid)
                data = self._fetch_with_retry(entity.api_get, fields=fields, max_attempts=2) # Fewer retries for fallback
                if data:
                    processed = self._process_entity_data(data.export_all_data(), entity_type)
                    if processed:
                        results.append(processed)
            except Exception as e:
                # Totally failed for this ID, log and skip
                # Create a "Safe Default" so we don't crash
                self.logger.warning(f"Failed to fetch individual {entity_type} {eid}: {e}")
                results.append({
                    f'{entity_type}_id' if entity_type != 'creative' else 'creative_id': str(eid),
                    f'{entity_type}_name': 'Unknown/Error',
                    f'{entity_type}_status': 'UNKNOWN'
                })
        return results

    def _process_entity_data(self, data: Dict, entity_type: str) -> Dict:
        """Standardize the raw API response into our schema"""
        try:
            if entity_type == 'creative':
                return self._process_creative_data(data)
            
            # Standard Entity Processing
            eid_str = str(data.get('id', ''))
            result = {
                f'{entity_type}_id': eid_str,
                f'{entity_type}_name': data.get('name', 'N/A'),
                f'{entity_type}_status': data.get('status', 'N/A'),
            }
            if entity_type == 'campaign': result['objective'] = data.get('objective')
            elif entity_type == 'adset': result['targeting'] = data.get('targeting')
            elif entity_type == 'ad':
                creative = data.get('creative')
                if creative and isinstance(creative, dict):
                    result['creative_id'] = str(creative.get('id', ''))
            return result
        except Exception:
            return None

    def _process_creative_data(self, data: Dict) -> Dict:
        """Special processing for creatives"""
        cid_str = str(data.get('id', ''))
        result = {
            'id': cid_str,
            'title': data.get('title', '')[:255],
            'body': data.get('body', '')[:500],
            'call_to_action_type': data.get('call_to_action_type'),
            'image_url': data.get('image_url') or data.get('thumbnail_url'),
            'video_id': data.get('video_id'),
            'is_video': bool(data.get('video_id')),
            'asset_feed_spec': data.get('asset_feed_spec'),
            'object_story_spec': data.get('object_story_spec'),
        }

        # Extract Video ID logic (Shared with old implementation but cleaner)
        if not result['video_id']:
            if result.get('asset_feed_spec') and isinstance(result['asset_feed_spec'], dict):
                videos = result['asset_feed_spec'].get('videos', [])
                if videos and isinstance(videos, list) and len(videos) > 0:
                    result['video_id'] = videos[0].get('video_id')
            
            if not result['video_id'] and result.get('object_story_spec') and isinstance(result['object_story_spec'], dict):
                oss = result['object_story_spec']
                video_data = oss.get('video_data')
                if video_data and isinstance(video_data, dict):
                    result['video_id'] = video_data.get('video_id')
        
        # Video Cache Logic
        if result['video_id']:
            vid_str = str(result['video_id'])
            result['is_video'] = True
            result['video_url'] = f"https://www.facebook.com/watch/?v={vid_str}" # Fallback
            
            # Check cache or simple fetch (non-blocking ideally, but we'll do quick cache check)
            # For speed in batch mode, we AVOID fetching video sources individually unless crucial
            # or if we implement a separate bulk video fetcher.
            # Preserving existing logic but warning about speed impact:
            
            # Simple improvement: Don't fetch individual videos in the batch loop. 
            # Leave the fallback URL. A separate process should enrich video URLs if needed.
        
        return result

    def _fetch_entire_account_metadata(self) -> pd.DataFrame:
        """Legacy bulk dump method for very large accounts"""
        try:
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

            return pd.concat(meta_parts, axis=0, ignore_index=True) if meta_parts else pd.DataFrame()

        except Exception as e:
            self.logger.error(f"Failed bulk metadata extraction: {e}")
            return pd.DataFrame()

    def _fetch_with_retry(self, func, *args, **kwargs):
        """Helper to fetch from API with retry and backoff"""
        max_attempts = kwargs.pop('max_attempts', MAX_RETRIES)
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Instant fail on auth errors
                if "190" in str(e): raise e

                if attempt == max_attempts - 1:
                    self.logger.error(f"Final attempt failed: {e}")
                    raise
                
                # Check for rate limit
                err_str = str(e).lower()
                is_rate_limit = "80004" in err_str or "17" in err_str or "rate limit" in err_str
                
                sleep_time = (2 ** attempt) * BASE_SLEEP_TIME
                if is_rate_limit: sleep_time *= 5 # Extra aggressive backup for rate limits
                
                self.logger.warning(f"Fetch failed (Attempt {attempt+1}): {e}. Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
        return None
    
    # ========== PRIVATE HELPERS ==========
    
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
    
    def _fetch_chunk(self, chunk: Dict, fields: List[str], breakdowns: List[str], total_chunks: int = 0) -> tuple:
        FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
        account = AdAccount(f'act_{self.account_id}')
        
        log_prefix = f"[{self.account_id}] Chunk {chunk['index']}/{total_chunks} ({chunk['start_date']} to {chunk['end_date']})"
        self.logger.info(f"{log_prefix}: Starting fetch...")

        params = {
            'level': 'ad', 'time_increment': 1, 'limit': 1000,
            'time_range': {'since': chunk['start_date'], 'until': chunk['end_date']},
        }
        if breakdowns: params['breakdowns'] = breakdowns
        
        try:
            insights = self._fetch_with_retry(account.get_insights, fields=fields, params=params)
            data = [dict(row) for row in insights]
            self.logger.info(f"{log_prefix}: Fetched {len(data)} rows.")
            return data, True, len(data)
        except Exception as e:
            self.logger.error(f"{log_prefix}: Failed. Error: {e}")
            return [], False, 0
    
    @staticmethod
    def _extract_field_name(field) -> str:
        if hasattr(field, 'value'): return field.value
        return str(field).split('.')[-1] if '.' in str(field) else str(field)

