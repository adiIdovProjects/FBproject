-- Migration: Add Row-Level Security (RLS) for Multi-Tenant Data Isolation
-- Date: 2026-01-06
-- Purpose: Enforce database-level isolation so even buggy queries can't leak data

-- Enable RLS on fact tables
ALTER TABLE fact_core_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_placement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_age_gender_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_country_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_action_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access data from their linked accounts
CREATE POLICY user_account_isolation_core ON fact_core_metrics
FOR SELECT
USING (
    campaign_id IN (
        SELECT c.campaign_id
        FROM dim_campaign c
        JOIN user_ad_account ua ON c.account_id = ua.account_id
        WHERE ua.user_id = current_setting('app.current_user_id', true)::int
    )
);

CREATE POLICY user_account_isolation_placement ON fact_placement_metrics
FOR SELECT
USING (
    campaign_id IN (
        SELECT c.campaign_id
        FROM dim_campaign c
        JOIN user_ad_account ua ON c.account_id = ua.account_id
        WHERE ua.user_id = current_setting('app.current_user_id', true)::int
    )
);

CREATE POLICY user_account_isolation_age_gender ON fact_age_gender_metrics
FOR SELECT
USING (
    campaign_id IN (
        SELECT c.campaign_id
        FROM dim_campaign c
        JOIN user_ad_account ua ON c.account_id = ua.account_id
        WHERE ua.user_id = current_setting('app.current_user_id', true)::int
    )
);

CREATE POLICY user_account_isolation_country ON fact_country_metrics
FOR SELECT
USING (
    campaign_id IN (
        SELECT c.campaign_id
        FROM dim_campaign c
        JOIN user_ad_account ua ON c.account_id = ua.account_id
        WHERE ua.user_id = current_setting('app.current_user_id', true)::int
    )
);

CREATE POLICY user_account_isolation_actions ON fact_action_metrics
FOR SELECT
USING (
    campaign_id IN (
        SELECT c.campaign_id
        FROM dim_campaign c
        JOIN user_ad_account ua ON c.account_id = ua.account_id
        WHERE ua.user_id = current_setting('app.current_user_id', true)::int
    )
);

-- Note: To use these policies, you must set user context in each database session:
-- SET LOCAL app.current_user_id = 35;
