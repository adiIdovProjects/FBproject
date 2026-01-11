-- Migration: Add account quiz responses table
-- Created: 2026-01-08
-- Description: Create table to store per-account quiz responses (goals, conversions, industry, priorities)

CREATE TABLE IF NOT EXISTS account_quiz_responses (
    account_id BIGINT PRIMARY KEY REFERENCES dim_account(account_id) ON DELETE CASCADE,

    -- Q1: Primary advertising goal
    primary_goal VARCHAR(100),
    primary_goal_other TEXT,

    -- Q2: Primary conversions (JSON array of conversion types)
    primary_conversions TEXT,

    -- Q3: Industry/Business type
    industry VARCHAR(100),

    -- Q4: Optimization priority
    optimization_priority VARCHAR(100),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_quiz_account_id ON account_quiz_responses(account_id);

-- Add updated_at trigger (follows existing pattern)
CREATE OR REPLACE FUNCTION update_account_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_account_quiz_updated_at
    BEFORE UPDATE ON account_quiz_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_account_quiz_updated_at();

COMMENT ON TABLE account_quiz_responses IS 'Per-account quiz responses for personalized insights';
COMMENT ON COLUMN account_quiz_responses.primary_goal IS 'Account advertising goal: purchases, leads, brand_awareness, engagement, book_meeting, other';
COMMENT ON COLUMN account_quiz_responses.primary_conversions IS 'JSON array of selected conversion types: ["purchase", "lead", "add_to_cart"]';
COMMENT ON COLUMN account_quiz_responses.industry IS 'Business industry: ecommerce, saas, local_business, b2b, agency, other';
COMMENT ON COLUMN account_quiz_responses.optimization_priority IS 'What user wants help with: scaling, reduce_costs, improve_creative, better_targeting, increase_conversions, other';
