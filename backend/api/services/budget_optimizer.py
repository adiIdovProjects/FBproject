"""
Smart Budget Optimization Service
Analyzes campaign performance with comparative analysis, demographics, placements, and creative insights.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class SmartBudgetOptimizer:
    """Advanced budget optimizer with comparative analysis and multi-dimensional insights"""

    def __init__(self, db: Session, account_ids: Optional[List[int]] = None):
        self.db = db
        self.account_ids = account_ids

    def _build_account_filter(self) -> Tuple[str, Dict[str, Any]]:
        """Build account filter SQL and params"""
        if not self.account_ids:
            return "", {}

        placeholders = ', '.join([f':acc_id_{i}' for i in range(len(self.account_ids))])
        filter_sql = f"AND f.account_id IN ({placeholders})"
        params = {f'acc_id_{i}': acc_id for i, acc_id in enumerate(self.account_ids)}
        return filter_sql, params

    def _has_revenue(self) -> bool:
        """Check if account has any revenue (ROAS > 0)"""
        account_filter, params = self._build_account_filter()

        query_str = f"""
            SELECT EXISTS(
                SELECT 1 FROM fact_core_metrics f
                WHERE f.conversions > 0
                {account_filter}
                LIMIT 1
            )
        """
        result = self.db.execute(text(query_str), params).scalar()
        return result

    def _get_period_data(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Fetch campaign data for a specific period"""
        account_filter, filter_params = self._build_account_filter()

        query = text(f"""
            SELECT
                c.campaign_name,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.conversions) as conversions,
                SUM(f.purchase_value) as revenue,
                SUM(f.purchases) as purchases,
                CASE
                    WHEN SUM(f.spend) > 0 AND SUM(f.conversions) > 0 THEN SUM(f.conversion_value) / SUM(f.spend)
                    ELSE NULL
                END as roas,
                CASE
                    WHEN SUM(f.impressions) > 0 THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                    ELSE 0
                END as ctr,
                CASE
                    WHEN SUM(f.conversions) > 0 THEN SUM(f.spend) / SUM(f.conversions)
                    ELSE 0
                END as cpa
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date BETWEEN :start_date AND :end_date
                AND c.campaign_name IS NOT NULL
                {account_filter}
            GROUP BY c.campaign_name
            HAVING SUM(f.spend) > 0
            ORDER BY spend DESC
        """)

        params = {"start_date": start_date, "end_date": end_date, **filter_params}
        result = self.db.execute(query, params)

        return [
            {
                'campaign_name': row.campaign_name,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'purchases': int(row.purchases or 0),
                'revenue': float(row.revenue or 0),
                'roas': float(row.roas) if row.roas is not None else 0.0,
                'ctr': float(row.ctr or 0),
                'cpa': float(row.cpa or 0)
            }
            for row in result
        ]

    def _compare_periods(
        self,
        current: List[Dict[str, Any]],
        previous: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """Compare current period with previous period"""
        comparison = {}

        # Create lookup for previous data
        prev_lookup = {c['campaign_name']: c for c in previous}

        for camp in current:
            name = camp['campaign_name']
            prev = prev_lookup.get(name, {})

            comparison[name] = {
                'current': camp,
                'previous': prev,
                'trends': {
                    'roas_change': camp['roas'] - prev.get('roas', 0),
                    'ctr_change': camp['ctr'] - prev.get('ctr', 0),
                    'spend_change': camp['spend'] - prev.get('spend', 0),
                    'conversions_change': camp['conversions'] - prev.get('conversions', 0),
                    'is_improving': (camp['roas'] or 0) > (prev.get('roas') or 0) and camp['conversions'] > prev.get('conversions', 0)
                }
            }

        return comparison

    def _get_demographic_insights(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Analyze performance by demographics (age, gender)"""
        account_filter, filter_params = self._build_account_filter()

        query = text(f"""
            SELECT
                da.age_group as age,
                dg.gender,
                SUM(agm.spend) as spend,
                0 as conversions,
                0 as purchases,
                NULL as roas,
                CASE
                    WHEN SUM(agm.impressions) > 0 THEN (SUM(agm.clicks)::float / SUM(agm.impressions)) * 100
                    ELSE 0
                END as ctr
            FROM fact_age_gender_metrics agm
            JOIN dim_date d ON agm.date_id = d.date_id
            JOIN dim_age da ON agm.age_id = da.age_id
            JOIN dim_gender dg ON agm.gender_id = dg.gender_id
            WHERE d.date BETWEEN :start_date AND :end_date
                {account_filter}
            GROUP BY da.age_group, dg.gender
            HAVING SUM(agm.spend) > 50
            ORDER BY ctr DESC
            LIMIT 10
        """)

        params = {"start_date": start_date, "end_date": end_date, **filter_params}
        result = self.db.execute(query, params)

        demographics = []
        for row in result:
            demographics.append({
                'age': row.age,
                'gender': row.gender,
                'spend': float(row.spend or 0),
                'conversions': int(row.conversions or 0),
                'purchases': int(row.purchases or 0),
                'roas': float(row.roas) if row.roas is not None else 0.0,
                'ctr': float(row.ctr or 0)
            })

        return {'top_demographics': demographics}

    def _get_placement_insights(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Analyze performance by placement"""
        account_filter, filter_params = self._build_account_filter()

        query = text(f"""
            SELECT
                p.placement_name as placement,
                SUM(pm.spend) as spend,
                SUM(pm.conversions) as conversions,
                SUM(pm.purchases) as purchases,
                CASE
                    WHEN SUM(pm.spend) > 0 AND SUM(pm.conversions) > 0 THEN SUM(pm.conversion_value) / SUM(pm.spend)
                    ELSE NULL
                END as roas,
                CASE
                    WHEN SUM(pm.impressions) > 0 THEN (SUM(pm.clicks)::float / SUM(pm.impressions)) * 100
                    ELSE 0
                END as ctr
            FROM fact_placement_metrics pm
            JOIN dim_date d ON pm.date_id = d.date_id
            JOIN dim_placement p ON pm.placement_id = p.placement_id
            WHERE d.date BETWEEN :start_date AND :end_date
                AND p.placement_name IS NOT NULL
                {account_filter.replace('f.account_id', 'pm.account_id')}
            GROUP BY p.placement_name
            HAVING SUM(pm.spend) > 50
            ORDER BY roas DESC
        """)

        params = {"start_date": start_date, "end_date": end_date, **filter_params}
        result = self.db.execute(query, params)

        placements = []
        for row in result:
            placements.append({
                'placement': row.placement,
                'spend': float(row.spend or 0),
                'conversions': int(row.conversions or 0),
                'purchases': int(row.purchases or 0),
                'roas': float(row.roas) if row.roas is not None else 0.0,
                'ctr': float(row.ctr or 0)
            })

        return {'placements': placements}

    def _get_best_creatives(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Get top performing ad creatives"""
        account_filter, filter_params = self._build_account_filter()

        query = text(f"""
            SELECT
                ad.ad_name,
                cr.title as ad_creative_title,
                cr.body as ad_creative_body,
                SUM(f.spend) as spend,
                SUM(f.conversions) as conversions,
                SUM(f.purchases) as purchases,
                CASE
                    WHEN SUM(f.spend) > 0 AND SUM(f.conversions) > 0 THEN SUM(f.conversion_value) / SUM(f.spend)
                    ELSE NULL
                END as roas,
                CASE
                    WHEN SUM(f.impressions) > 0 THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                    ELSE 0
                END as ctr
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_ad ad ON f.ad_id = ad.ad_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date BETWEEN :start_date AND :end_date
                AND ad.ad_name IS NOT NULL
                AND f.conversions > 0
                {account_filter}
            GROUP BY ad.ad_name, cr.title, cr.body
            HAVING SUM(f.spend) > 20
            ORDER BY roas DESC
            LIMIT 5
        """)

        params = {"start_date": start_date, "end_date": end_date, **filter_params}
        result = self.db.execute(query, params)

        creatives = []
        for row in result:
            creatives.append({
                'ad_name': row.ad_name,
                'title': row.ad_creative_title or 'N/A',
                'body': (row.ad_creative_body[:100] + '...') if row.ad_creative_body and len(row.ad_creative_body) > 100 else (row.ad_creative_body or 'N/A'),
                'spend': float(row.spend or 0),
                'conversions': int(row.conversions or 0),
                'purchases': int(row.purchases or 0),
                'roas': float(row.roas) if row.roas is not None else 0.0,
                'ctr': float(row.ctr or 0)
            })

        return creatives

    def _get_time_patterns(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Analyze performance by day of week"""
        account_filter, filter_params = self._build_account_filter()

        query = text(f"""
            SELECT
                EXTRACT(DOW FROM d.date) as day_of_week,
                AVG(CASE
                    WHEN f.spend > 0 AND f.conversions > 0 THEN f.conversion_value / f.spend
                    ELSE NULL
                END) as avg_roas,
                SUM(f.spend) as total_spend,
                SUM(f.conversions) as total_conversions
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date BETWEEN :start_date AND :end_date
                {account_filter}
            GROUP BY day_of_week
            ORDER BY avg_roas DESC
        """)

        params = {"start_date": start_date, "end_date": end_date, **filter_params}
        result = self.db.execute(query, params)

        day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        patterns = []

        for row in result:
            day_num = int(row.day_of_week)
            patterns.append({
                'day': day_names[day_num],
                'avg_roas': float(row.avg_roas) if row.avg_roas is not None else 0.0,
                'total_spend': float(row.total_spend or 0),
                'total_conversions': int(row.total_conversions or 0)
            })

        return {'day_patterns': patterns}

    def generate_smart_recommendations(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Generate comprehensive budget optimization recommendations with comparative analysis.

        Returns:
            Dictionary with recommendations, insights, and actionable suggestions
        """
        # Check if account has revenue
        if not self._has_revenue():
            return {
                'error': 'No revenue detected in account',
                'message': 'Budget optimization requires conversion tracking to be set up. ROAS is 0, indicating no conversions are being tracked.',
                'suggestions': [
                    'Verify Facebook Pixel is installed correctly',
                    'Check conversion events are firing',
                    'Review conversion tracking setup'
                ]
            }

        # Calculate previous period dates
        period_length = (end_date - start_date).days
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=period_length)

        # Fetch data
        current_campaigns = self._get_period_data(start_date, end_date)
        previous_campaigns = self._get_period_data(prev_start_date, prev_end_date)

        if not current_campaigns:
            return {
                'error': 'No campaign data found',
                'message': f'No campaigns with spend found between {start_date} and {end_date}'
            }

        # Compare periods
        comparison = self._compare_periods(current_campaigns, previous_campaigns)

        # Get insights
        demographics = self._get_demographic_insights(start_date, end_date)
        placements = self._get_placement_insights(start_date, end_date)
        best_creatives = self._get_best_creatives(start_date, end_date)
        time_patterns = self._get_time_patterns(start_date, end_date)

        # Analyze trends and generate recommendations
        recommendations = {
            'period_comparison': {
                'current_period': f"{start_date} to {end_date}",
                'previous_period': f"{prev_start_date} to {prev_end_date}",
                'period_length_days': period_length
            },
            'improving_campaigns': [],
            'declining_campaigns': [],
            'budget_recommendations': [],
            'targeting_insights': {
                'best_demographics': demographics['top_demographics'][:3] if demographics.get('top_demographics') else [],
                'best_placements': placements['placements'][:3] if placements.get('placements') else [],
                'best_days': time_patterns['day_patterns'][:3] if time_patterns.get('day_patterns') else []
            },
            'best_ads': best_creatives,
            'action_items': []
        }

        # Identify improving and declining campaigns
        for name, data in comparison.items():
            curr = data['current']
            trends = data['trends']

            if trends['is_improving']:
                recommendations['improving_campaigns'].append({
                    'campaign': name,
                    'current_roas': curr['roas'],
                    'roas_improvement': trends['roas_change'],
                    'spend': curr['spend'],
                    'action': 'increase',
                    'recommendation': f"Increase budget by 30-50% - ROAS improved by {trends['roas_change']:.2f}x"
                })
            elif trends['roas_change'] < -0.5 and curr['spend'] > 100:
                recommendations['declining_campaigns'].append({
                    'campaign': name,
                    'current_roas': curr['roas'],
                    'roas_decline': trends['roas_change'],
                    'spend': curr['spend'],
                    'action': 'decrease' if curr['roas'] > 1.0 else 'pause',
                    'recommendation': f"{'Decrease budget by 50%' if curr['roas'] > 1.0 else 'Pause campaign'} - ROAS declined by {abs(trends['roas_change']):.2f}x"
                })

        # Sort by impact
        recommendations['improving_campaigns'].sort(key=lambda x: x['current_roas'] * x['spend'], reverse=True)
        recommendations['declining_campaigns'].sort(key=lambda x: x['spend'], reverse=True)

        # Generate action items
        if recommendations['improving_campaigns']:
            top_improving = recommendations['improving_campaigns'][0]
            recommendations['action_items'].append(
                f"✅ INCREASE: '{top_improving['campaign']}' is trending up with {top_improving['current_roas']:.2f}x ROAS (+{top_improving['roas_improvement']:.2f}x improvement)"
            )

        if recommendations['declining_campaigns']:
            top_declining = recommendations['declining_campaigns'][0]
            recommendations['action_items'].append(
                f"⚠️ {top_declining['action'].upper()}: '{top_declining['campaign']}' is declining with {top_declining['current_roas']:.2f}x ROAS ({top_declining['roas_decline']:.2f}x drop)"
            )

        if demographics['top_demographics']:
            top_demo = demographics['top_demographics'][0]
            recommendations['action_items'].append(
                f"🎯 TARGET: {top_demo['age']} {top_demo['gender']} has best ROAS ({top_demo['roas']:.2f}x) - focus targeting here"
            )

        if placements['placements']:
            top_placement = placements['placements'][0]
            recommendations['action_items'].append(
                f"📱 PLACEMENT: {top_placement['placement']} performs best ({top_placement['roas']:.2f}x ROAS) - increase bids"
            )

        if best_creatives:
            top_creative = best_creatives[0]
            recommendations['action_items'].append(
                f"🎨 CREATIVE: '{top_creative['ad_name']}' is top performer ({top_creative['roas']:.2f}x ROAS, {top_creative['ctr']:.2f}% CTR) - replicate this style"
            )

        if time_patterns['day_patterns']:
            best_day = time_patterns['day_patterns'][0]
            recommendations['action_items'].append(
                f"📅 TIMING: {best_day['day']} has best performance ({best_day['avg_roas']:.2f}x ROAS) - increase budgets on this day"
            )

        return recommendations
