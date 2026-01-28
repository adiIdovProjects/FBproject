-- Migration: Add Performance Indexes
-- Created: 2026-01-25
-- Description: Adds missing indexes for query performance optimization

-- ============================================================================
-- FACT TABLE INDEXES - account_id (Critical for multi-tenant queries)
-- ============================================================================

-- fact_core_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_core_account
    ON fact_core_metrics(account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_core_account_date
    ON fact_core_metrics(account_id, date_id);

-- fact_placement_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_placement_account
    ON fact_placement_metrics(account_id);

-- fact_age_gender_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_age_gender_account
    ON fact_age_gender_metrics(account_id);

-- fact_country_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_country_account
    ON fact_country_metrics(account_id);

-- fact_action_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_action_account
    ON fact_action_metrics(account_id);

-- ============================================================================
-- DIMENSION TABLE INDEXES
-- ============================================================================

-- dim_action_type - for conversion filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dim_action_type_conversion
    ON dim_action_type(is_conversion);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS (Added 2026-01-28)
-- ============================================================================

-- fact_core_metrics - most common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_core_date_account_campaign
    ON fact_core_metrics(date_id, account_id, campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_core_date_account_adset
    ON fact_core_metrics(date_id, account_id, adset_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_core_date_account_ad
    ON fact_core_metrics(date_id, account_id, ad_id);

-- fact_placement_metrics - placement breakdown queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_placement_date_account_placement
    ON fact_placement_metrics(date_id, account_id, placement_id);

-- fact_age_gender_metrics - demographic breakdown queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_age_gender_date_account_age
    ON fact_age_gender_metrics(date_id, account_id, age_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_age_gender_date_account_gender
    ON fact_age_gender_metrics(date_id, account_id, gender_id);

-- fact_country_metrics - geographic breakdown queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_country_date_account_country
    ON fact_country_metrics(date_id, account_id, country_id);

-- fact_action_metrics - conversion/action queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_action_date_account_action
    ON fact_action_metrics(date_id, account_id, action_type_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename LIKE 'fact_%' ORDER BY indexname;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dim_action_type';
