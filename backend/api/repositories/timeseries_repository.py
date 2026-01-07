from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class TimeSeriesRepository(BaseRepository):
    """Repository for time series metrics."""

    def get_time_series(
        self,
        start_date: date,
        end_date: date,
        granularity: str = "day",
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get time series metrics data.
        """
        # Determine date truncation based on granularity
        if granularity == "week":
            date_trunc = "DATE_TRUNC('week', d.date)"
        elif granularity == "month":
            date_trunc = "DATE_TRUNC('month', d.date)"
        else:
            date_trunc = "d.date"

        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

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
                {date_trunc}::date as date,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.leads) as leads,
                SUM(f.lead_website) as lead_website,
                SUM(f.lead_form) as lead_form
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            LEFT JOIN (
                SELECT fam.date_id, fam.account_id, fam.campaign_id, fam.adset_id, fam.ad_id, fam.creative_id,
                       SUM(fam.action_count) as action_count,
                       SUM(fam.action_value) as action_value
                FROM fact_action_metrics fam
                JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                JOIN dim_date d2 ON fam.date_id = d2.date_id
                WHERE dat.is_conversion = TRUE
                    AND d2.date >= :start_date
                    AND d2.date <= :end_date
                GROUP BY 1, 2, 3, 4, 5, 6
            ) conv ON f.date_id = conv.date_id 
                  AND f.account_id = conv.account_id 
                  AND f.campaign_id = conv.campaign_id
                  AND f.adset_id = conv.adset_id
                  AND f.ad_id = conv.ad_id
                  AND f.creative_id = conv.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {account_filter}
            GROUP BY {date_trunc}
            ORDER BY date ASC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            **param_account_ids
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        time_series = []
        for row in results:
            time_series.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0),
                'leads': int(row.leads or 0),
                'lead_website': int(row.lead_website or 0),
                'lead_form': int(row.lead_form or 0)
            })

        return time_series
