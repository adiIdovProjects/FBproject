"""
transformers/core_transformer.py - Core Data Transformation Logic
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# טעינת הגדרות
from backend.config.settings import (
    COLUMN_RENAME_MAP, MISSING_DIM_VALUE, UNKNOWN_MEMBER_ID
)

from backend.utils.mapping_utils import map_country_code


class CoreTransformer:
    """טרנספורמר מרכזי לניקוי והכנת נתוני פייסבוק לטבלאות העובדות (Fact Tables)"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def transform(self, df: pd.DataFrame, metadata_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        צינור העיבוד המרכזי:
        1. שינוי שמות עמודות
        2. טיפול במזהי ישויות (IDs)
        3. יצירת מפתח תאריך (date_id)
        4. טיפול ב-Breakdowns (מגדר, גיל, מיקומים)
        5. מיזוג מטא-דאטה (שמות סטטוסים וכו')
        6. המרת מדדים (Metrics) לערכים נומריים
        7. ניקוי עמודות מורכבות (Nested JSON)
        """
        
        if df.empty:
            self.logger.warning("Input DataFrame is empty")
            return df
        
        self.logger.info(f"Starting transformation on {len(df)} rows...")
        
        df_clean = df.copy()
        
        # 1. שינוי שמות עמודות לפי המפה בהגדרות
        df_clean.rename(columns=COLUMN_RENAME_MAP, inplace=True)
        
        # 2. טיפול במזהי ישויות - הבטחת טיפוס BigInteger ומילוי חוסרים
        df_clean = self._handle_entity_ids(df_clean)
        
        # 3. יצירת date_id (פורמט YYYYMMDD)
        df_clean = self._create_date_id(df_clean)
        
        # 4. טיפול בעמודות Breakdown
        df_clean = self._handle_breakdown_columns(df_clean)
        
        # 5. מיזוג מטא-דאטה (שמות קמפיינים, מודעות וכו') במידה וסופק
        if metadata_df is not None and not metadata_df.empty:
            df_clean = self._merge_metadata(df_clean, metadata_df)
        
        # 6. טיפול במדדים (Metrics) כולל לוגיקת Click Fallback
        df_clean = self._handle_metrics(df_clean)
        
        # 7. הסרת עמודות מורכבות שלא נשמרות בטבלאות עובדות רגילות
        df_clean = self._drop_complex_columns(df_clean)
        
        self.logger.info(f"Transformation complete: {len(df_clean)} rows")
        
        return df_clean
    
    def _handle_entity_ids(self, df: pd.DataFrame) -> pd.DataFrame:
        """המרת מזהים למספרים שלמים וטיפול בערכים חסרים"""
        
        id_cols = ['account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id']
        
        for col in id_cols:
            if col in df.columns:
                # Precision Safe Conversion: avoid float
                def to_int_safe(val):
                    if pd.isna(val) or str(val).strip() in ['', '0', '0.0', 'None', 'nan']:
                        return UNKNOWN_MEMBER_ID
                    try:
                        # Convert to string and take only the integer part if there's a decimal point
                        s = str(val).split('.')[0].strip()
                        return int(s)
                    except:
                        return UNKNOWN_MEMBER_ID
                
                df[col] = df[col].apply(to_int_safe).astype(np.int64)
            else:
                # יצירת עמודה עם ערך ברירת מחדל אם היא חסרה
                df[col] = UNKNOWN_MEMBER_ID
        
        return df
    
    def _create_date_id(self, df: pd.DataFrame) -> pd.DataFrame:
        """יצירת מפתח תאריך נומרי (למשל 20231025) לצורך ביצועים ב-DB"""
        
        if 'date_start' not in df.columns:
            self.logger.error("Missing 'date_start' column")
            df['date_id'] = UNKNOWN_MEMBER_ID
            return df
        
        df['date_dt'] = pd.to_datetime(df['date_start'], errors='coerce')
        df['date_id'] = df['date_dt'].dt.strftime('%Y%m%d').fillna('0')
        df['date_id'] = pd.to_numeric(df['date_id'], errors='coerce').fillna(UNKNOWN_MEMBER_ID).astype(np.int64)
        
        df.drop(columns=['date_dt'], errors='ignore', inplace=True)
        return df
    
    def _handle_breakdown_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """טיפול בעמודות פילוח והחלפת ערכים ריקים בערך ברירת מחדל (N/A)"""
        
        breakdown_cols = ['country', 'age', 'gender', 'placement_name', 'publisher_platform']
        
        for col in breakdown_cols:
            if col in df.columns:
                df[col] = df[col].astype(str).replace(['nan', 'None', '', 'None'], MISSING_DIM_VALUE)
                df[col].fillna(MISSING_DIM_VALUE, inplace=True)
                
                # Apply Mapping for country
                if col == 'country':
                    df['country'] = df['country'].apply(map_country_code)
        
        # התאמה לשמות הממדים ב-Schema
        if 'age' in df.columns:
            df['age_group'] = df['age']
            df.drop(columns=['age'], inplace=True, errors='ignore')
            
        if 'publisher_platform' in df.columns:
            # Clean base columns first
            df['publisher_platform'] = df['publisher_platform'].astype(str).replace(['nan', 'None', '', 'None'], MISSING_DIM_VALUE)
            
            if 'platform_position' in df.columns:
                df['platform_position'] = df['platform_position'].astype(str).replace(['nan', 'None', '', 'None'], MISSING_DIM_VALUE)
                
                # Logic: Combine Platform + Position
                # Avoid redundant naming (e.g., 'instagram - instagram_stories' -> 'instagram - stories')
                def clean_v(p, pos):
                    if p == MISSING_DIM_VALUE or pos == MISSING_DIM_VALUE:
                        if p != MISSING_DIM_VALUE: return p.title()
                        return MISSING_DIM_VALUE
                    
                    p_lower = p.lower()
                    pos_lower = pos.lower()
                    
                    # Remove platform prefix from position if present
                    clean_pos = pos_lower
                    if pos_lower.startswith(p_lower + "_"):
                        clean_pos = pos_lower.replace(p_lower + "_", "", 1)
                    
                    # Mapping logic for clean names
                    name = clean_pos.replace('_', ' ').title()
                    
                    if p_lower == 'facebook':
                        if 'story' in pos_lower: return 'Facebook Stories'
                        if 'reel' in pos_lower: return 'Facebook Reels'
                        if 'search' in pos_lower: return 'Facebook Search'
                        if 'marketplace' in pos_lower: return 'Facebook Marketplace'
                        if 'instain_article' in pos_lower: return 'Facebook Instant Articles'
                        if 'video' in pos_lower: return 'Facebook Video Feeds'
                        return f"Facebook {name}" if name != 'Feed' else 'Facebook Feed'
                    
                    if p_lower == 'instagram':
                        if 'story' in pos_lower: return 'Instagram Stories'
                        if 'reel' in pos_lower: return 'Instagram Reels'
                        if 'explore' in pos_lower: return 'Instagram Explore'
                        return f"Instagram {name}"
                    
                    if p_lower == 'messenger':
                        if 'story' in pos_lower: return 'Messenger Stories'
                        return 'Messenger Inbox'
                    
                    if p_lower == 'audience_network':
                        return f"Audience Network {name}"

                    return f"{p.title()} {name}"
                
                df['placement_name'] = df.apply(lambda x: clean_v(x['publisher_platform'], x['platform_position']), axis=1)
            else:
                df['placement_name'] = df['publisher_platform']
            
            # Final cleanup of N/A values
            df['placement_name'] = df['placement_name'].replace(['nan - nan', 'None - None', 'nan', 'None', '', f'{MISSING_DIM_VALUE} - {MISSING_DIM_VALUE}'], MISSING_DIM_VALUE)
            
            # Drop the original columns to keep fact tables clean
            df.drop(columns=['publisher_platform', 'platform_position'], errors='ignore', inplace=True)
        
        return df
    
    def _merge_metadata(self, df: pd.DataFrame, metadata_df: pd.DataFrame) -> pd.DataFrame:
        """מיזוג שמות וסטטוסים שהגיעו משליפת ה-Metadata של ה-API"""
        
        self.logger.info(f"Merging metadata for {len(df)} rows")
        
        # Add logging for creative_id in metadata_df
        if 'creative_id' in metadata_df.columns:
            # Convert to string first to handle mixed types, then clean and get unique non-zero IDs
            creative_ids_in_meta = metadata_df['creative_id'].astype(str).str.strip().replace(['0', '0.0', 'nan', 'None', ''], pd.NA).dropna().unique().tolist()
            self.logger.info(f"Metadata has {len(creative_ids_in_meta)} unique non-zero creative_ids")
        else:
            self.logger.warning("Metadata MISSING creative_id column!")

        # הבטחת טיפוסים זהים לצורך המיזוג (Merge)
        # Create a copy to avoid modifying the original metadata_df in place if it's used elsewhere
        metadata_df_copy = metadata_df.copy()
        id_cols = ['campaign_id', 'adset_id', 'ad_id', 'creative_id']
        for col in id_cols:
            def safe_id(val):
                if pd.isna(val) or str(val).strip() in ['', '0', '0.0', 'None', 'nan']:
                    return 0
                try:
                    # Precision Safe: avoid float conversion for large FB IDs
                    # Just take everything before the decimal point as a string
                    s = str(val).split('.')[0].strip()
                    if not s: return 0
                    return int(s)
                except:
                    return 0

            if col in df.columns:
                df[col] = df[col].apply(safe_id).astype(np.int64)
            if col in metadata_df.columns:
                metadata_df[col] = metadata_df[col].apply(safe_id).astype(np.int64)

        # רשימת ישויות למיזוג
        entities = [
            ('campaign_id', ['campaign_name', 'campaign_status', 'objective']),
            ('adset_id', ['adset_name', 'adset_status', 'targeting']),
            ('ad_id', ['ad_name', 'ad_status', 'creative_id']),
            ('creative_id', ['title', 'body', 'image_url', 'video_url', 'is_video', 'is_carousel'])
        ]

        for id_col, meta_cols in entities:
            if id_col in metadata_df.columns:
                # סינון עמודות קיימות בלבד
                available_meta = [c for c in meta_cols if c in metadata_df.columns]
                subset = metadata_df[[id_col] + available_meta].drop_duplicates(subset=[id_col])
                
                df = df.merge(subset, on=id_col, how='left', suffixes=('', '_meta'))
                
                # Debug logging for creative_id merge
                if 'creative_id' in available_meta:
                    self.logger.info(f"Merging creative_id. subset size: {len(subset)}")
                    if 'creative_id_meta' in df.columns:
                        non_null = df['creative_id_meta'].count()
                        self.logger.info(f"creative_id_meta non-nulls: {non_null}")

                # העדפת ערך ה-Metadata על פני הערך הגולמי (אם קיים)
                for col in available_meta:
                    meta_col_name = f"{col}_meta"
                    if meta_col_name in df.columns:
                        df[col] = df[meta_col_name].combine_first(df[col] if col in df.columns else pd.Series(dtype='object'))
                        df.drop(columns=[meta_col_name], inplace=True)
                        if col == 'creative_id':
                            self.logger.info(f"After merge, creative_id non-zeros: {(df['creative_id'] != 0).sum()}")

        return df
    
    def _handle_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """המרת מדדים למספרים וביצוע לוגיקת בחירת קליקים (Cascading Fallback)"""

        # 1. Parse Complex Action Arrays (Video Metrics)
        video_action_map = {
            'video_play_actions': 'video_plays',
            'video_p25_watched_actions': 'video_p25_watched',
            'video_p50_watched_actions': 'video_p50_watched',
            'video_p75_watched_actions': 'video_p75_watched',
            'video_p100_watched_actions': 'video_p100_watched',
            'video_avg_time_watched_actions': 'video_avg_time_watched'
        }

        for raw_col, target_col in video_action_map.items():
            if raw_col in df.columns:
                def extract_action_sum(val):
                    if not val or not isinstance(val, list): return 0
                    try:
                        # FB returns list of dicts: [{'action_type': '...', 'value': '123'}]
                        # Use float() first as some metrics (like avg watch time) can be decimals
                        return sum(int(float(item.get('value', 0))) for item in val if isinstance(item, dict))
                    except:
                        return 0
                
                df[target_col] = df[raw_col].apply(extract_action_sum)
                
                # Debug logging for video metrics
                total_val = df[target_col].sum()
                if total_val > 0:
                    self.logger.info(f"📊 Parsed {target_col}: Total {total_val}")
                else:
                    # If target is 0 but raw exists, maybe parsing failed?
                    non_null_raw = df[df[raw_col].notna()][raw_col]
                    if not non_null_raw.empty:
                         self.logger.warning(f"⚠️ {target_col} is 0 despite {len(non_null_raw)} raw rows. Sample: {non_null_raw.iloc[0]}")

        # 2. Basic Metric Conversion
        metric_cols = [
            'spend', 'impressions', 'clicks',
            'purchases', 'purchase_value', 'leads', 'add_to_cart',
            'lead_website', 'lead_form',
            'video_plays', 'video_p25_watched', 'video_p50_watched',
            'video_p75_watched', 'video_p100_watched', 'video_avg_time_watched'
        ]

        for col in metric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                # המרת מונים למספר שלם, כסף ל-Float
                if col in ['spend', 'purchase_value']:
                    df[col] = df[col].astype(float)
                else:
                    df[col] = df[col].astype(np.int64)

        # לוגיקת קליקים: סדר עדיפויות להבטחת איכות הנתון
        # 1. inline_link_clicks (הכי מדויק לאתר) 
        # 2. link_clicks 
        # 3. outbound_clicks 
        # 4. clicks (כללי - כולל לייקים ותגובות)
        
        click_options = ['inline_link_clicks', 'link_clicks', 'outbound_clicks', 'clicks']
        chosen_source = None
        final_clicks_series = None

        for opt in click_options:
            if opt in df.columns:
                vals = pd.to_numeric(df[opt], errors='coerce').fillna(0)
                if vals.sum() > 0:
                    final_clicks_series = vals
                    chosen_source = opt
                    break

        if final_clicks_series is not None:
            df['clicks'] = final_clicks_series.astype(np.int64)
            self.logger.info(f"✅ Mapped {chosen_source} to 'clicks'")
        else:
            df['clicks'] = 0
            self.logger.warning("⚠️ No positive click data found in any field.")

        return df
    
    def _drop_complex_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """הסרת עמודות של מערכים (JSON) שלא מתאימות לטבלאות עובדות שטוחות"""
        
        cols_to_drop = [
            'cost_per_action_type',
            'conversions', 'conversion_values',
            'video_play_actions', 'video_p25_watched_actions',
            'video_p50_watched_actions', 'video_p75_watched_actions',
            'video_p100_watched_actions',
            'video_avg_time_watched_actions'
        ]
        
        df.drop(columns=[col for col in cols_to_drop if col in df.columns], 
                errors='ignore', inplace=True)
        
        return df


def clean_and_transform(df: pd.DataFrame, metadata_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """פונקציית נוחות להרצת הטרנספורמציה"""
    transformer = CoreTransformer()
    return transformer.transform(df, metadata_df)