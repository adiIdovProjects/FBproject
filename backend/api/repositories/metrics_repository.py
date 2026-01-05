"""
Data access layer for metrics queries.

This module contains the core database queries for retrieving metrics data.
Uses SQLAlchemy Core for raw SQL queries with proper parameter binding.
"""

from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class MetricsRepository(BaseRepository):
    """Repository for core metrics data access"""

    def get_account_currency(self) -> str:
        """
        Get the currency from dim_account table.
        Prioritizes real accounts over the 'Unknown Account' (ID 0).
        
        Returns:
            Currency code (e.g., 'USD', 'EUR', 'ILS')
        """
        # Exclude ID 0 and sort to prioritize real names if possible
        query = text("""
            SELECT currency 
            FROM dim_account 
            WHERE account_id != 0 
            ORDER BY (CASE WHEN account_name = 'Unknown Account' THEN 1 ELSE 0 END) ASC
            LIMIT 1
        """)
        result = self.db.execute(query).scalar()
        
        # Fallback to ID 0 or default to USD
        if not result:
            query_fb = text("SELECT currency FROM dim_account WHERE account_id = 0 LIMIT 1")
            result = self.db.execute(query_fb).scalar()
            
        return str(result) if result else "USD"

    def get_aggregated_metrics(
        self,
        start_date: date,
        end_date: date,
        campaign_status: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated metrics for a date range.

        Args:
            start_date: Start date
            end_date: End date
            campaign_status: Optional status filter (ACTIVE, PAUSED, ALL)
            account_ids: Optional list of account IDs to filter by

        Returns:
            Dict containing aggregated metrics
        """
        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != 'ALL':
            status_filter = "AND c.campaign_status = :status"

        # Build account filter
        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

        query = text(f"""
            SELECT
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.leads) as leads,
                SUM(f.lead_website) as lead_website,
                SUM(f.lead_form) as lead_form,
                SUM(f.add_to_cart) as add_to_cart,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p50_watched) as video_p50_watched,
                SUM(f.video_p75_watched) as video_p75_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            LEFT JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            LEFT JOIN (
                SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id,
                       SUM(action_count) as action_count,
                       SUM(action_value) as action_value
                FROM fact_action_metrics fam
                JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                WHERE dat.is_conversion = TRUE
                GROUP BY 1, 2, 3, 4, 5, 6
            ) conv ON f.date_id = conv.date_id 
                  AND f.account_id = conv.account_id 
                  AND f.campaign_id = conv.campaign_id
                  AND f.adset_id = conv.adset_id
                  AND f.ad_id = conv.ad_id
                  AND f.creative_id = conv.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {status_filter}
                {account_filter}
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            **param_account_ids
        }

        if campaign_status and campaign_status != 'ALL':
            params['status'] = campaign_status

        result = self.db.execute(query, params).fetchone()

        if not result:
            return self._empty_metrics()

        res_map = result._mapping
        return {
            'spend': float(res_map.get('spend', 0) or 0),
            'impressions': int(res_map.get('impressions', 0) or 0),
            'clicks': int(res_map.get('clicks', 0) or 0),
            'conversions': int(res_map.get('conversions', 0) or 0),
            'conversion_value': float(res_map.get('conversion_value', 0) or 0),
            'purchases': int(res_map.get('purchases', 0) or 0),
            'purchase_value': float(res_map.get('purchase_value', 0) or 0),
            'leads': int(res_map.get('leads', 0) or 0),
            'lead_website': int(res_map.get('lead_website', 0) or 0),
            'lead_form': int(res_map.get('lead_form', 0) or 0),
            'add_to_cart': int(res_map.get('add_to_cart', 0) or 0),
            'video_plays': int(res_map.get('video_plays', 0) or 0),
            'video_p25_watched': int(res_map.get('video_p25_watched', 0) or 0),
            'video_p50_watched': int(res_map.get('video_p50_watched', 0) or 0),
            'video_p75_watched': int(res_map.get('video_p75_watched', 0) or 0),
            'video_p100_watched': int(res_map.get('video_p100_watched', 0) or 0),
            'video_avg_time_watched': float(res_map.get('video_avg_time_watched', 0) or 0)
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics dict with all expected keys"""
        return {
            'spend': 0.0,
            'impressions': 0,
            'clicks': 0,
            'conversions': 0,
            'conversion_value': 0.0,
            'purchases': 0,
            'purchase_value': 0.0,
            'leads': 0,
            'lead_website': 0,
            'lead_form': 0,
            'add_to_cart': 0,
            'video_plays': 0,
            'video_p25_watched': 0,
            'video_p50_watched': 0,
            'video_p75_watched': 0,
            'video_p100_watched': 0,
            'video_avg_time_watched': 0.0
        }
