"""
transformers/fact_builder.py - Split transformed data into fact tables
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict

logger = logging.getLogger(__name__)

from backend.config.settings import UNKNOWN_MEMBER_ID, MISSING_DIM_VALUE, TOP_COUNTRIES_LIMIT


class FactBuilder:
    """Build fact tables from transformed data"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def build_all_facts(self, df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """
        Split data into appropriate fact tables based on breakdowns
        
        Returns:
            Dictionary with fact table names as keys, DataFrames as values
        """
        
        if df.empty:
            self.logger.warning("Input DataFrame is empty")
            return {}
        
        self.logger.info(f"Building fact tables from {len(df)} rows...")
        
        facts = {}
        
        # Determine which fact tables to build based on columns present
        has_placement = 'placement_name' in df.columns and df['placement_name'].notna().any()
        has_age_gender = ('age_group' in df.columns and 'gender' in df.columns and 
                         df['age_group'].notna().any() and df['gender'].notna().any())
        has_country = 'country' in df.columns and df['country'].notna().any()
        
        # Build core metrics (always)
        core_df = self._build_fact_core(df)
        if not core_df.empty:
            facts['fact_core_metrics'] = core_df
            self.logger.info(f"Built fact_core_metrics: {len(core_df)} rows")
        
        # Build action metrics (granular conversions) - NEW
        if 'action_type' in df.columns:
            action_df = self._build_fact_actions(df)
            if not action_df.empty:
                facts['fact_action_metrics'] = action_df
                self.logger.info(f"Built fact_action_metrics: {len(action_df)} rows")

        # Build placement metrics
        if has_placement:
            placement_df = self._build_fact_placement(df)
            if not placement_df.empty:
                facts['fact_placement_metrics'] = placement_df
                self.logger.info(f"Built fact_placement_metrics: {len(placement_df)} rows")
        
        # Build age/gender metrics
        if has_age_gender:
            age_gender_df = self._build_fact_age_gender(df)
            if not age_gender_df.empty:
                facts['fact_age_gender_metrics'] = age_gender_df
                self.logger.info(f"Built fact_age_gender_metrics: {len(age_gender_df)} rows")
        
        # Build country metrics
        if has_country:
            country_df = self._build_fact_country(df)
            if not country_df.empty:
                facts['fact_country_metrics'] = country_df
                self.logger.info(f"Built fact_country_metrics: {len(country_df)} rows")
        
        return facts
    
    def _build_fact_core(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build fact_core_metrics (no breakdowns)"""
        
        # Required columns
        required_cols = [
            'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id'
        ]
        
        # Metric columns
        metric_cols = [
            'spend', 'impressions', 'clicks',
            'purchases', 'purchase_value', 'leads', 'add_to_cart',
            'lead_website', 'lead_form',
            'video_plays', 'video_p25_watched', 'video_p50_watched',
            'video_p75_watched', 'video_p100_watched', 'video_avg_time_watched'
        ]
        
        # Select columns that exist in the dataframe
        cols_to_select = required_cols + [col for col in metric_cols if col in df.columns]
        
        # Copy only the necessary data
        # CRITICAL: Filter only core data to avoid duplication from breakdowns
        df_fact = df[df.get('_data_source') == 'core'][cols_to_select].copy()
        
        # Fill missing metrics with 0 (ensures aggregation doesn't fail)
        for col in metric_cols:
            if col not in df_fact.columns:
                if col in ['spend', 'purchase_value', 'video_avg_time_watched']:
                    df_fact[col] = 0.0
                else:
                    df_fact[col] = 0
        
        # Ensure no NaN values reach the database (Postgres NOT NULL constraint)
        for col in metric_cols:
            if col in df_fact.columns:
                if col in ['spend', 'purchase_value', 'video_avg_time_watched']:
                    df_fact[col] = df_fact[col].fillna(0.0)
                else:
                    df_fact[col] = df_fact[col].fillna(0).astype(np.int64)
        
        # Group and aggregate
        # We define the aggregation map explicitly to ensure all metrics are summed
        agg_map = {col: 'sum' for col in metric_cols if col in df_fact.columns}
        
        df_fact = df_fact.groupby(required_cols, as_index=False).agg(agg_map)
        
        return df_fact

    def _build_fact_actions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build granular fact_action_metrics table from parsed actions"""
        
        # Required identifier columns for action table
        required_cols = [
            'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
            'action_type', 'attribution_window'
        ]
        
        # Check if we have the necessary columns for actions
        if not all(col in df.columns for col in required_cols):
            return pd.DataFrame()

        # Filter to rows that actually have an action type (from parse_actions_dataframe)
        # CRITICAL: Filter only core data for actions to avoid duplication
        df_actions = df[(df['action_type'].notna()) & (df.get('_data_source') == 'core')].copy()
        
        if df_actions.empty:
            return pd.DataFrame()

        # Group and aggregate counts and values
        df_fact = df_actions.groupby(required_cols, as_index=False).agg({
            'action_count': 'sum',
            'action_value': 'sum'
        })
        
        return df_fact
    
    def _build_fact_placement(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build fact_placement_metrics"""
        
        required_cols = [
            'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
            'placement_name'
        ]
        
        metric_cols = ['spend', 'impressions', 'clicks']
        
        # Filter to rows with placement
        # CRITICAL: Filter only placement breakdown data
        df_placement = df[
            (df['placement_name'].notna()) & 
            (df['placement_name'] != MISSING_DIM_VALUE) &
            (df['placement_name'] != 'N/A') &
            (df.get('_data_source') == 'placement')
        ].copy()
        
        if df_placement.empty:
            return pd.DataFrame()
        
        cols_to_select = required_cols + metric_cols
        df_fact = df_placement[cols_to_select].copy()
        
        # Fill missing metrics
        for col in metric_cols:
            if col not in df_fact.columns:
                df_fact[col] = 0.0 if col == 'spend' else 0
        
        # Group and aggregate
        df_fact = df_fact.groupby(required_cols, as_index=False).agg({
            'spend': 'sum',
            'impressions': 'sum',
            'clicks': 'sum',
        })
        
        return df_fact
    
    def _build_fact_age_gender(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build fact_age_gender_metrics"""
        
        required_cols = [
            'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
            'age_group', 'gender'
        ]
        
        metric_cols = ['spend', 'impressions', 'clicks']
        
        df_age_gender = df.copy()
        
        # CRITICAL: Filter only demographic breakdown data
        if '_data_source' in df_age_gender.columns:
            df_age_gender = df_age_gender[df_age_gender['_data_source'] == 'demographic']
        
        # Ensure age_group and gender columns exist
        if 'age_group' not in df_age_gender.columns:
            df_age_gender['age_group'] = 'Unknown Age'
        if 'gender' not in df_age_gender.columns:
            df_age_gender['gender'] = 'Unknown'
        
        # Replace N/A with proper unknown values
        df_age_gender['age_group'] = df_age_gender['age_group'].replace('N/A', 'Unknown Age')
        df_age_gender['gender'] = df_age_gender['gender'].replace('N/A', 'Unknown')
        
        cols_to_select = required_cols + metric_cols
        df_fact = df_age_gender[cols_to_select].copy()
        
        # Fill missing metrics
        for col in metric_cols:
            if col not in df_fact.columns:
                df_fact[col] = 0.0 if col == 'spend' else 0
        
        # Group and aggregate
        df_fact = df_fact.groupby(required_cols, as_index=False).agg({
            'spend': 'sum',
            'impressions': 'sum',
            'clicks': 'sum',
        })
        
        return df_fact
    
    def _build_fact_country(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build fact_country_metrics with top N countries optimization"""

        required_cols = [
            'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
            'country'
        ]

        metric_cols = ['spend', 'impressions', 'clicks']

        # Filter to rows with country
        # CRITICAL: Filter only geographic breakdown data
        df_country = df[
            (df['country'].notna()) &
            (df['country'] != MISSING_DIM_VALUE) &
            (df['country'] != 'N/A') &
            (df.get('_data_source') == 'geographic')
        ].copy()

        if df_country.empty:
            return pd.DataFrame()

        cols_to_select = required_cols + metric_cols
        df_fact = df_country[cols_to_select].copy()

        # Fill missing metrics
        for col in metric_cols:
            if col not in df_fact.columns:
                df_fact[col] = 0.0 if col == 'spend' else 0

        # Group and aggregate first
        df_fact = df_fact.groupby(required_cols, as_index=False).agg({
            'spend': 'sum',
            'impressions': 'sum',
            'clicks': 'sum',
        })

        # OPTIMIZATION: Keep only top N countries per (ad_id, date_id) by spend
        # Aggregate remaining countries into "Other"
        if TOP_COUNTRIES_LIMIT and TOP_COUNTRIES_LIMIT > 0:
            df_fact = self._filter_top_countries(df_fact, TOP_COUNTRIES_LIMIT)

        return df_fact

    def _filter_top_countries(self, df: pd.DataFrame, top_n: int) -> pd.DataFrame:
        """Keep top N countries by spend per (ad_id, date_id), aggregate rest as 'Other'"""

        if df.empty:
            return df

        group_cols = ['date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id']

        # Rank countries by spend within each ad/date group
        df['_rank'] = df.groupby(group_cols)['spend'].rank(method='first', ascending=False)

        # Split into top N and "other"
        df_top = df[df['_rank'] <= top_n].copy()
        df_other = df[df['_rank'] > top_n].copy()

        # Aggregate "other" countries
        if not df_other.empty:
            df_other_agg = df_other.groupby(group_cols, as_index=False).agg({
                'spend': 'sum',
                'impressions': 'sum',
                'clicks': 'sum',
            })
            df_other_agg['country'] = 'Other'

            # Combine top N + aggregated "Other"
            df_result = pd.concat([df_top.drop(columns=['_rank']), df_other_agg], ignore_index=True)
        else:
            df_result = df_top.drop(columns=['_rank'])

        self.logger.info(f"Country optimization: {len(df)} rows → {len(df_result)} rows (top {top_n} + Other)")

        return df_result


def build_fact_tables(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """Convenience function"""
    builder = FactBuilder()
    return builder.build_all_facts(df)