-- Migration: Add business_profiles table + drop account_quiz_responses
-- Created: 2026-01-29
-- Description: Replace account quiz with business profiles for AI-powered business intelligence

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
    id SERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES dim_account(account_id) ON DELETE CASCADE,

    -- User input
    website_url TEXT,
    business_description TEXT,

    -- AI-extracted structured profile
    business_type VARCHAR(100),
    business_model VARCHAR(50),
    target_audience TEXT,
    tone_of_voice VARCHAR(100),
    products_services TEXT,
    geographic_focus TEXT,
    industry VARCHAR(100),
    value_propositions TEXT,
    visual_style_notes TEXT,

    -- Social media analysis
    content_themes TEXT,
    posting_style TEXT,
    engagement_patterns TEXT,

    -- Meta
    analysis_status VARCHAR(50) DEFAULT 'pending',
    website_analyzed_at TIMESTAMP,
    social_analyzed_at TIMESTAMP,
    profile_json TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_business_profile_account UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_business_profile_account_id ON business_profiles(account_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_business_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_profile_updated_at
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_business_profile_updated_at();

-- Drop old account quiz table
DROP TABLE IF EXISTS account_quiz_responses CASCADE;
DROP FUNCTION IF EXISTS update_account_quiz_updated_at() CASCADE;

COMMENT ON TABLE business_profiles IS 'Per-account business profile for AI-powered recommendations and ad creation';
