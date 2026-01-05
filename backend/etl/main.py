"""
main.py - Complete ETL Orchestrator (Refactored)

This is the main entry point that orchestrates the entire ETL pipeline.
All business logic has been extracted to separate modules.
"""

import pandas as pd
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
import time
from datetime import date, timedelta, datetime
from typing import Dict

# Configuration
from backend.config.settings import (
    FIRST_PULL_DAYS, DAILY_PULL_DAYS, ACTIVE_BREAKDOWN_GROUPS,
    STATIC_AGE_GROUPS, STATIC_GENDER_GROUPS, UNKNOWN_MEMBER_DEFAULTS,
    FACT_TABLE_PKS, DIMENSION_PKS
)

# Database
from backend.models.schema import create_schema
from backend.utils.db_utils import (
    get_db_engine, get_latest_date_in_db, ensure_unknown_members,
    save_dataframe, load_lookup_cache, clear_fact_data, LOOKUP_CACHE
)

# Extractors
from backend.extractors.fb_api import FacebookExtractor

# Transformers
from backend.transformers.core_transformer import clean_and_transform
from backend.transformers.action_parser import (
    parse_actions_dataframe, extract_top_conversions_for_fact_core,
    parse_video_actions
)
from backend.transformers.fact_builder import build_fact_tables
from backend.transformers.dimension_builder import extract_dimensions, prepare_dimension_for_load

# Set up logging
from backend.utils.logging_utils import setup_logging, get_logger
setup_logging()
logger = get_logger(__name__)

MAIN_FACT_TABLE = 'fact_core_metrics'


class ETLPipeline:
    """Main ETL orchestrator"""
    
    def __init__(self):
        self.engine = get_db_engine()
        self.extractor = FacebookExtractor()
        self.logger = get_logger(self.__class__.__name__)
        self.stats = {
            "extract": {},
            "transform": {},
            "load": {"dimensions": {}, "facts": {}},
            "durations": {}
        }
    
    def run(self, start_date: date, end_date: date):
        """
        Run the complete ETL pipeline
        
        Args:
            start_date: Start date for data pull
            end_date: End date for data pull
        """
        
        start_time_total = time.time()
        self.logger.info(
            f"Starting ETL Pipeline: {start_date} to {end_date}",
            extra={"event": "etl_start", "start_date": str(start_date), "end_date": str(end_date)}
        )
        
        try:
            # Step 1: Ensure schema exists
            self._ensure_schema()
            
            # Step 2: Extract data from Facebook
            start_extract = time.time()
            raw_data = self._extract_data(start_date, end_date)
            self.stats["durations"]["extract"] = round(time.time() - start_extract, 2)
            
            if not raw_data:
                self.logger.warning("No data extracted. Exiting.")
                return
            
            # Step 3: Transform data
            start_transform = time.time()
            transformed_data = self._transform_data(raw_data)
            self.stats["durations"]["transform"] = round(time.time() - start_transform, 2)
            
            # Step 4: Load dimensions
            start_load_dim = time.time()
            self._load_dimensions(transformed_data)
            self.stats["durations"]["load_dimensions"] = round(time.time() - start_load_dim, 2)
            
            # Step 5: Load facts
            start_load_fact = time.time()
            self._load_facts(transformed_data)
            self.stats["durations"]["load_facts"] = round(time.time() - start_load_fact, 2)

            # Step 6: Validate data quality
            self._validate_loaded_data()

            total_duration = round(time.time() - start_time_total, 2)
            self.logger.info(
                f"ETL Pipeline completed successfully in {total_duration}s",
                extra={
                    "event": "etl_complete",
                    "duration_s": total_duration,
                    "stats": self.stats
                }
            )
            
        except Exception as e:
            self.logger.error(
                f"ETL Pipeline failed: {e}", 
                extra={"event": "etl_failure", "stats": self.stats},
                exc_info=True
            )
            raise
    
    def _ensure_schema(self):
        """Create database schema if it doesn't exist"""
        self.logger.info("STEP 1: Ensuring database schema exists...")
        create_schema(self.engine)
        
        # Ensure unknown members exist
        self.logger.info("Ensuring unknown members (ID=0) exist...")
        for table_name in UNKNOWN_MEMBER_DEFAULTS.keys():
            ensure_unknown_members(self.engine, table_name, UNKNOWN_MEMBER_DEFAULTS[table_name])
    
    def _extract_data(self, start_date: date, end_date: date) -> Dict[str, pd.DataFrame]:
        """
        Extract data from Facebook API
        Returns:
            Dictionary with keys: 'core', 'breakdowns', 'metadata', 'creatives', 'account_info'
        """
        self.logger.info("STEP 2: Extracting data from Facebook API...")

        days_to_pull = (end_date - start_date).days + 1

        if days_to_pull <= 0:
            self.logger.warning("No days to pull. Database is up to date.")
            return {}

        # Initialize extractor
        if not self.extractor.initialize():
            self.logger.error("Failed to initialize Facebook API")
            return {}

        # 2.0: Extract account information
        self.logger.info("2.0: Fetching account information...")
        account_info = self.extractor.get_account_info()

        # 2.1: Extract core data
        self.logger.info("2.1: Extracting core metrics...")
        df_core = self.extractor.get_core_data(start_date, end_date)
        
        if df_core.empty:
            self.logger.warning("No core data retrieved")
            return {}
        
        # 2.2: Extract breakdowns
        self.logger.info("2.2: Extracting breakdown data...")
        breakdowns = {}
        for breakdown_group in ACTIVE_BREAKDOWN_GROUPS:
            df_breakdown = self.extractor.get_breakdown_data(
                breakdown_group['breakdowns'],
                start_date,
                end_date
            )
            if not df_breakdown.empty:
                self.logger.info(f"Breakdown '{breakdown_group['type']}' sample:\n{df_breakdown.head(3)}")
                breakdowns[breakdown_group['type']] = df_breakdown
        
        # 2.3: Extract metadata
        self.logger.info("2.3: Extracting metadata (campaign/adset/ad names & statuses)...")
        df_metadata = self.extractor.get_metadata(df_core)
        
        # 2.4: Extract creative details
        self.logger.info("2.4: Extracting creative details...")
        # Get unique creative IDs from metadata (since they're not in core data)
        if not df_metadata.empty and 'creative_id' in df_metadata.columns:
            creative_ids = df_metadata['creative_id'].dropna().unique().tolist()
            if creative_ids:
                df_creatives = self.extractor.get_creative_details(creative_ids)
            else:
                self.logger.warning("No creative IDs found in metadata")
                df_creatives = pd.DataFrame()
        else:
            self.logger.warning("creative_id missing from metadata!")
            df_creatives = pd.DataFrame()

        self.stats["extract"] = {
            "core_rows": len(df_core),
            "metadata_rows": len(df_metadata),
            "creatives_rows": len(df_creatives),
            "breakdowns": {k: len(v) for k, v in breakdowns.items()}
        }

        return {
            'core': df_core,
            'breakdowns': breakdowns,
            'metadata': df_metadata,
            'creatives': df_creatives,
            'account_info': account_info
        }
    
    def _transform_data(self, raw_data: Dict) -> Dict:
        """
        Transform raw data into fact and dimension tables
        
        Returns:
            Dictionary with keys: 'facts', 'dimensions', 'actions'
        """
        
        self.logger.info("STEP 3: Transforming data...")
        
        # Combine core + breakdowns with source tagging
        raw_data['core']['_data_source'] = 'core'
        dfs_to_combine = [raw_data['core']]
        
        for breakdown_type, breakdown_df in raw_data['breakdowns'].items():
            breakdown_df['_data_source'] = breakdown_type
            dfs_to_combine.append(breakdown_df)
        
        df_combined = pd.concat(dfs_to_combine, ignore_index=True)
        
        # Clean and transform
        self.logger.info("3.1: Cleaning and standardizing data...")
        df_clean = clean_and_transform(df_combined, raw_data.get('metadata'))
        
        # Parse actions into fact_action_metrics
        self.logger.info("3.2: Parsing actions for granular conversion tracking...")
        df_actions = parse_actions_dataframe(df_clean)
        
        # Extract top conversions for fact_core
        self.logger.info("3.3: Extracting top conversions for fact_core_metrics...")
        df_clean = extract_top_conversions_for_fact_core(df_clean)
        
        # Parse video metrics
        self.logger.info("3.4: Parsing video metrics...")
        df_clean = parse_video_actions(df_clean)
        
        # Build fact tables
        self.logger.info("3.5: Building fact tables...")
        fact_tables = build_fact_tables(df_clean)
        
        # Extract dimensions
        self.logger.info("3.6: Extracting dimension members...")
        dimensions = extract_dimensions(df_clean, df_actions, raw_data.get('creatives'), raw_data.get('account_info'))

        self.stats["transform"] = {
            "combined_rows": len(df_combined),
            "clean_rows": len(df_clean),
            "action_rows": len(df_actions),
            "fact_tables": {k: len(v) for k, v in fact_tables.items()}
        }

        return {
            'facts': fact_tables,
            'actions': df_actions,
            'dimensions': dimensions
        }
    
    def _load_dimensions(self, transformed_data: Dict):
        """Load dimension tables"""
        
        self.logger.info("STEP 4: Loading dimension tables...")
        
        dimensions = transformed_data.get('dimensions', {})
        
        # Load static dimensions first
        self._load_static_dimensions()
        
        # CRITICAL: Load dates BEFORE other dimensions (they have no FK dependencies)
        self.logger.info("4.1: Loading date dimension...")
        self._load_dates(transformed_data.get('facts', {}))
        
        # Load entity dimensions in order (respecting FK dependencies)
        # Order matters: account → campaign → adset → ad → creative
        load_order = [
            'dim_account',
            'dim_campaign', 
            'dim_adset',
            'dim_creative',
            'dim_ad',
            'dim_country',
            'dim_placement',
            'dim_action_type',
        ]
        
        for dim_name in load_order:
            df_dim = dimensions.get(dim_name)
            
            if df_dim is None or df_dim.empty:
                continue
            
            pk_cols = DIMENSION_PKS.get(dim_name, [])
            if not pk_cols:
                self.logger.warning(f"No primary key defined for {dim_name}, skipping")
                continue
            
            # Prepare for load (cast types, etc.)
            df_prepared = prepare_dimension_for_load(df_dim, dim_name)
            
            # Save
            success = save_dataframe(
                self.engine,
                df_prepared,
                dim_name,
                pk_cols,
                is_fact=False
            )
            
            if success:
                self.logger.info(f"✅ Loaded {dim_name}: {len(df_prepared)} rows")
                self.stats["load"]["dimensions"][dim_name] = len(df_prepared)
            else:
                self.logger.error(f"❌ Failed to load {dim_name}")
                self.stats["load"]["dimensions"][dim_name] = "FAILED"
        
        # Reload lookup cache
        self.logger.info("4.5: Reloading lookup cache...")
        load_lookup_cache(self.engine)
    
    def _load_dates(self, fact_dfs: Dict[str, pd.DataFrame]):
        """
        Load all unique dates from fact tables into dim_date
        
        This ensures all date_ids in facts have corresponding entries in dim_date
        """
        
        if not fact_dfs:
            return
        
        # Extract all unique date_ids from all fact tables
        all_date_ids = set()
        
        for fact_name, df_fact in fact_dfs.items():
            if 'date_id' in df_fact.columns:
                date_ids = df_fact['date_id'].unique()
                all_date_ids.update(date_ids)
        
        # Remove unknown member (0)
        if 0 in all_date_ids:
            all_date_ids.remove(0)
        
        if not all_date_ids:
            self.logger.warning("No dates to load")
            return
        
        # Convert date_ids to dates and create dim_date DataFrame
        
        date_rows = []
        for date_id in all_date_ids:
            try:
                # Convert YYYYMMDD to date
                date_str = str(int(date_id))
                if len(date_str) == 8:
                    year = int(date_str[:4])
                    month = int(date_str[4:6])
                    day = int(date_str[6:8])
                    
                    dt = datetime(year, month, day)
                    
                    date_rows.append({
                        'date_id': int(date_id),
                        'date': dt.date(),
                        'year': year,
                        'month': month,
                        'day_of_week': dt.strftime('%A'),
                    })
            except Exception as e:
                self.logger.warning(f"Invalid date_id: {date_id} - {e}")
        
        if not date_rows:
            self.logger.warning("No valid dates to load")
            return
        
        df_dates = pd.DataFrame(date_rows)
        
        # Save to dim_date
        success = save_dataframe(
            self.engine,
            df_dates,
            'dim_date',
            ['date_id'],
            is_fact=False
        )
        
        if success:
            self.logger.info(f"✅ Loaded dim_date: {len(df_dates)} dates")
        else:
            self.logger.error("❌ Failed to load dim_date")
    
    def _load_static_dimensions(self):
        """Load static dimensions (age, gender) with unknown members"""
        
        # Age - with unknown member (ID=0)
        age_groups = ['Unknown Age'] + STATIC_AGE_GROUPS  # Add unknown member first
        df_age = pd.DataFrame({'age_group': age_groups})
        save_dataframe(self.engine, df_age, 'dim_age', ['age_group'], is_fact=False)
        
        # Gender - with unknown member (ID=0)
        genders = ['Unknown'] + STATIC_GENDER_GROUPS  # Add unknown member first
        df_gender = pd.DataFrame({'gender': genders})
        save_dataframe(self.engine, df_gender, 'dim_gender', ['gender'], is_fact=False)
        
        self.logger.info("✅ Loaded static dimensions (age, gender)")
    
    def _load_facts(self, transformed_data: Dict):
        """Load fact tables"""
        
        self.logger.info("STEP 5: Loading fact tables...")
        
        facts = transformed_data.get('facts', {})
        actions = transformed_data.get('actions', pd.DataFrame())
        
        # 5.0: Clear existing data for the processed date range to ensure accuracy
        # This prevents duplication and allows re-attribution of "Unknown" rows
        if facts:
            # Get date range from fact_core_metrics or any fact table
            # Assuming all facts in this run cover the same range
            fact_tables = list(facts.keys())
            if actions is not None and not actions.empty:
                fact_tables.append('fact_action_metrics')
                
            first_fact = next(iter(facts.values()))
            if not first_fact.empty and 'date_id' in first_fact.columns:
                start_id = int(first_fact['date_id'].min())
                end_id = int(first_fact['date_id'].max())
                self.logger.info(f"5.0: Clearing existing fact data for range {start_id} to {end_id}...")
                clear_fact_data(self.engine, fact_tables, start_id, end_id)

        # Load regular fact tables
        for fact_name, df_fact in facts.items():
            if df_fact.empty:
                continue
            
            pk_cols = FACT_TABLE_PKS.get(fact_name, [])
            if not pk_cols:
                self.logger.warning(f"No primary key defined for {fact_name}, skipping")
                continue
            
            # Perform lookups (name → ID) for attribute dimensions
            df_prepared = self._prepare_fact_for_load(df_fact, fact_name)
            
            # CRITICAL: Filter out rows with ID=0 for attribute dimensions
            # These couldn't be looked up and will cause FK violations
            initial_count = len(df_prepared)
            
            if 'gender_id' in df_prepared.columns:
                df_prepared = df_prepared[df_prepared['gender_id'] != 0]
            if 'age_id' in df_prepared.columns:
                df_prepared = df_prepared[df_prepared['age_id'] != 0]
            if 'country_id' in df_prepared.columns:
                df_prepared = df_prepared[df_prepared['country_id'] != 0]
            if 'placement_id' in df_prepared.columns:
                df_prepared = df_prepared[df_prepared['placement_id'] != 0]
            
            filtered_count = initial_count - len(df_prepared)
            if filtered_count > 0:
                self.logger.warning(
                    f"Filtered out {filtered_count} rows from {fact_name} "
                    f"due to unmapped dimension values ({filtered_count/initial_count*100:.1f}%)"
                )
            
            if df_prepared.empty:
                self.logger.warning(f"No rows to load for {fact_name} after filtering")
                continue
            
            # Save
            success = save_dataframe(
                self.engine,
                df_prepared,
                fact_name,
                pk_cols,
                is_fact=True
            )
            
            if success:
                self.logger.info(f"✅ Loaded {fact_name}: {len(df_prepared)} rows")
                self.stats["load"]["facts"][fact_name] = len(df_prepared)
            else:
                self.logger.error(f"❌ Failed to load {fact_name}")
                self.stats["load"]["facts"][fact_name] = "FAILED"
        
        # Load fact_action_metrics
        if not actions.empty:
            df_actions_prepared = self._prepare_fact_actions_for_load(actions)
            success = save_dataframe(
                self.engine,
                df_actions_prepared,
                'fact_action_metrics',
                FACT_TABLE_PKS['fact_action_metrics'],
                is_fact=True
            )
            
            if success:
                self.logger.info(f"✅ Loaded fact_action_metrics: {len(df_actions_prepared)} rows")
                self.stats["load"]["facts"]["fact_action_metrics"] = len(df_actions_prepared)
            else:
                self.logger.error(f"❌ Failed to load fact_action_metrics")
                self.stats["load"]["facts"]["fact_action_metrics"] = "FAILED"
    
    def _prepare_fact_for_load(self, df: pd.DataFrame, fact_name: str) -> pd.DataFrame:
        """
        Prepare fact table for loading
        - Perform lookups (name → ID) for attribute dimensions
        - Drop name columns
        - Cast to final types
        """
        
        df_prep = df.copy()
        
        # Get lookup cache
        # Use global cache
        
        # Perform lookups based on fact table
        if 'placement_name' in df_prep.columns:
            # Clean placement_name before lookup
            df_prep['placement_name'] = df_prep['placement_name'].astype(str).str.strip()
            df_prep.loc[df_prep['placement_name'].isin(['N/A', 'nan', 'None', '']), 'placement_name'] = 'Unknown'
            
            df_prep['placement_id'] = df_prep['placement_name'].map(
                LOOKUP_CACHE.get('dim_placement', {})
            )
            
            # If lookup failed, try to get the 'Unknown' ID
            unknown_placement_id = LOOKUP_CACHE.get('dim_placement', {}).get('Unknown')
            if unknown_placement_id is not None:
                df_prep['placement_id'].fillna(unknown_placement_id, inplace=True)
            else:
                df_prep['placement_id'].fillna(0, inplace=True)
            
            df_prep['placement_id'] = df_prep['placement_id'].astype(int)
            df_prep.drop(columns=['placement_name'], inplace=True)
        
        if 'age_group' in df_prep.columns:
            # Clean age_group before lookup
            df_prep['age_group'] = df_prep['age_group'].astype(str).str.strip()
            df_prep.loc[df_prep['age_group'].isin(['N/A', 'nan', 'None', '']), 'age_group'] = 'Unknown'
            
            df_prep['age_id'] = df_prep['age_group'].map(
                LOOKUP_CACHE.get('dim_age', {})
            )
            
            # If lookup failed, try to get the 'Unknown' ID
            unknown_age_id = LOOKUP_CACHE.get('dim_age', {}).get('Unknown')
            if unknown_age_id is not None:
                df_prep['age_id'].fillna(unknown_age_id, inplace=True)
            else:
                self.logger.warning(f"Could not find 'Unknown Age' in lookup cache. Available: {list(LOOKUP_CACHE.get('dim_age', {}).keys())}")
                df_prep['age_id'].fillna(0, inplace=True)
            
            df_prep['age_id'] = df_prep['age_id'].astype(int)
            df_prep.drop(columns=['age_group'], inplace=True)
        
        if 'gender' in df_prep.columns:
            # Clean gender before lookup
            df_prep['gender'] = df_prep['gender'].astype(str).str.strip()
            df_prep.loc[df_prep['gender'].isin(['N/A', 'nan', 'None', '']), 'gender'] = 'Unknown'
            
            # Debug: Show unique gender values before lookup
            unique_genders = df_prep['gender'].unique()
            self.logger.debug(f"Unique genders before lookup: {unique_genders}")
            self.logger.debug(f"Gender lookup cache: {LOOKUP_CACHE.get('dim_gender', {})}")
            
            df_prep['gender_id'] = df_prep['gender'].map(
                LOOKUP_CACHE.get('dim_gender', {})
            )
            
            # If lookup failed, try to get the 'Unknown' ID
            unknown_gender_id = LOOKUP_CACHE.get('dim_gender', {}).get('Unknown')
            if unknown_gender_id is not None:
                df_prep['gender_id'].fillna(unknown_gender_id, inplace=True)
            else:
                self.logger.warning(f"Could not find 'Unknown' in gender lookup cache. Available: {list(LOOKUP_CACHE.get('dim_gender', {}).keys())}")
                df_prep['gender_id'].fillna(0, inplace=True)
            
            df_prep['gender_id'] = df_prep['gender_id'].astype(int)
            
            # Debug: Check if any gender_id is still 0
            zero_count = (df_prep['gender_id'] == 0).sum()
            if zero_count > 0:
                self.logger.warning(f"Found {zero_count} rows with gender_id=0 after lookup")
                problematic_genders = df_prep[df_prep['gender_id'] == 0]['gender'].unique() if 'gender' in df_prep.columns else []
                if len(problematic_genders) > 0:
                    self.logger.warning(f"Problematic gender values: {problematic_genders}")
            
            df_prep.drop(columns=['gender'], inplace=True, errors='ignore')
        
        if 'country' in df_prep.columns:
            # Clean country before lookup
            df_prep['country'] = df_prep['country'].astype(str).str.strip()
            df_prep.loc[df_prep['country'].isin(['N/A', 'nan', 'None', '']), 'country'] = 'Unknown'
            
            df_prep['country_id'] = df_prep['country'].map(
                LOOKUP_CACHE.get('dim_country', {})
            )
            
            # If lookup failed, try to get the 'Unknown' ID
            unknown_country_id = LOOKUP_CACHE.get('dim_country', {}).get('Unknown')
            if unknown_country_id is not None:
                df_prep['country_id'].fillna(unknown_country_id, inplace=True)
            else:
                df_prep['country_id'].fillna(0, inplace=True)
            
            df_prep['country_id'] = df_prep['country_id'].astype(int)
            df_prep.drop(columns=['country'], inplace=True)
        
        return df_prep
    
    def _prepare_fact_actions_for_load(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare fact_action_metrics for loading"""

        df_prep = df.copy()

        # Lookup action_type → action_type_id
        # Use global cache

        df_prep['action_type_id'] = df_prep['action_type'].map(
            LOOKUP_CACHE.get('dim_action_type', {})
        ).fillna(0).astype(int)

        df_prep.drop(columns=['action_type'], inplace=True)

        return df_prep

    def _validate_loaded_data(self):
        """
        Validate data quality after load
        Check for common issues:
        - All campaign names = 'Unknown Campaign'
        - All clicks = 0
        - All statuses = 'UNKNOWN'
        """

        self.logger.info("="*80)
        self.logger.info("STEP 6: Validating loaded data quality...")
        self.logger.info("="*80)

        try:
            from sqlalchemy import text

            with self.engine.connect() as conn:
                # Check campaign names
                result = conn.execute(text("""
                    SELECT
                        COUNT(*) as total,
                        SUM(CASE WHEN campaign_name = 'Unknown Campaign' THEN 1 ELSE 0 END) as unknown_count,
                        SUM(CASE WHEN campaign_name LIKE 'ERROR%' OR campaign_name LIKE 'DELETED%' OR campaign_name LIKE 'AUTH%' THEN 1 ELSE 0 END) as error_count
                    FROM dim_campaign
                    WHERE campaign_id != 0
                """)).fetchone()

                if result:
                    total, unknown, errors = result
                    if total > 0:
                        unknown_pct = (unknown / total) * 100
                        error_pct = (errors / total) * 100

                        self.logger.info(f"📊 Campaign Names: {total} total campaigns")
                        self.logger.info(f"   'Unknown Campaign': {unknown} ({unknown_pct:.1f}%)")
                        self.logger.info(f"   API Errors: {errors} ({error_pct:.1f}%)")

                        if unknown_pct > 50:
                            self.logger.warning(
                                f"⚠️  WARNING: {unknown_pct:.1f}% of campaigns have 'Unknown Campaign' name. "
                                "Check metadata extraction and merge logic."
                            )

                        if error_pct > 10:
                            self.logger.error(
                                f"❌ ERROR: {error_pct:.1f}% of campaigns have API errors. "
                                "Check Facebook API permissions or deleted campaigns."
                            )

                # Check clicks
                result = conn.execute(text("""
                    SELECT
                        COUNT(*) as total_rows,
                        SUM(clicks) as total_clicks,
                        SUM(impressions) as total_impressions
                    FROM fact_core_metrics
                    WHERE date_id != 0
                """)).fetchone()

                if result:
                    total_rows, total_clicks, total_imps = result
                    if total_rows > 0:
                        self.logger.info(f"📊 Clicks Data: {total_rows} fact rows")
                        self.logger.info(f"   Total clicks: {total_clicks:,}")
                        self.logger.info(f"   Total impressions: {total_imps:,}")

                        if total_clicks == 0 and total_imps > 0:
                            self.logger.error(
                                "❌ CRITICAL: 0 clicks but impressions > 0. "
                                "Check if inline_link_clicks is in BASE_FIELDS_TO_PULL."
                            )
                        elif total_clicks > 0:
                            ctr = (total_clicks / total_imps * 100) if total_imps > 0 else 0
                            self.logger.info(f"   CTR: {ctr:.2f}%")

        except Exception as e:
            self.logger.error(f"Validation failed: {e}")

        self.logger.info("="*80)


def main():
    """Main entry point"""
    
    # Get date range
    engine = get_db_engine()
    latest_date_str = get_latest_date_in_db(engine, MAIN_FACT_TABLE)
    end_date = date.today() - timedelta(days=1)  # Yesterday
    
    import os
    force_historical = os.getenv("FORCE_HISTORICAL_PULL", "false").lower() == "true"
    
    if latest_date_str and not force_historical:
        try:
            start_date = datetime.strptime(latest_date_str, '%Y-%m-%d').date() + timedelta(days=1)
            if start_date > end_date:
                logger.info("Database is up to date. No data to pull.")
                return
        except ValueError:
            start_date = end_date - timedelta(days=FIRST_PULL_DAYS)
    else:
        # First run or forced re-pull - pull 3 years
        start_date = end_date - timedelta(days=FIRST_PULL_DAYS)
    
    logger.info(f"📅 Pull range: {start_date} to {end_date} (Forced: {force_historical})")
    
    # Run ETL
    pipeline = ETLPipeline()
    pipeline.run(start_date, end_date)


if __name__ == '__main__':
    main()