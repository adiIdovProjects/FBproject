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
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename LIKE 'fact_%' ORDER BY indexname;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dim_action_type';
