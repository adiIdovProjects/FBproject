-- Migration: Add lead funnel tables
-- Created: 2026-02-07
-- Description: Tables for lead funnel stage tracking

-- Table 1: Per-account funnel stage names (customizable)
CREATE TABLE IF NOT EXISTS lead_funnel_stages (
    account_id BIGINT PRIMARY KEY REFERENCES dim_account(account_id) ON DELETE CASCADE,
    stage_names TEXT NOT NULL DEFAULT '["New Lead", "Contacted", "Meeting Booked", "Proposal Sent", "Closed"]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: Individual lead stage assignments
CREATE TABLE IF NOT EXISTS lead_stage_assignments (
    id SERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES dim_account(account_id) ON DELETE CASCADE,
    fb_lead_id VARCHAR(100) NOT NULL,
    lead_form_id VARCHAR(100) NOT NULL,
    stage_index INTEGER NOT NULL DEFAULT 0 CHECK (stage_index >= 0 AND stage_index <= 4),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_lead_stage_assignment UNIQUE (account_id, fb_lead_id, lead_form_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_account ON lead_stage_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_form ON lead_stage_assignments(lead_form_id);

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_lead_funnel_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_funnel_stages_updated_at
    BEFORE UPDATE ON lead_funnel_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_funnel_stages_updated_at();

CREATE OR REPLACE FUNCTION update_lead_stage_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_stage_assignments_updated_at
    BEFORE UPDATE ON lead_stage_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_stage_assignments_updated_at();

COMMENT ON TABLE lead_funnel_stages IS 'Per-account customizable funnel stage names';
COMMENT ON TABLE lead_stage_assignments IS 'Individual lead to stage assignments for funnel tracking';
