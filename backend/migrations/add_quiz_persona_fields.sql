-- Migration: Add new quiz persona fields
-- Date: 2026-01-28
-- Description: Add platform_reason, company_type, and role_with_ads columns for better non-marketer persona tracking

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_reason VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_type VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_with_ads VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN users.platform_reason IS 'Why user came to platform: manage_easily, detailed_analysis, ai_insights, custom_reports, save_time, other';
COMMENT ON COLUMN users.company_type IS 'Business context: smb, freelancer, own_business, enterprise, agency, other';
COMMENT ON COLUMN users.role_with_ads IS 'Relationship with ad campaigns: run_myself, manage_team, review_results, learning, other';
