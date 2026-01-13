-- Migration: Add page_id column to user_ad_account table
-- Purpose: Store default Facebook Page ID for each linked ad account
-- Date: 2026-01-11

-- Add page_id column to user_ad_account junction table
ALTER TABLE user_ad_account
ADD COLUMN IF NOT EXISTS page_id VARCHAR(100);

-- Add comment explaining the column
COMMENT ON COLUMN user_ad_account.page_id IS 'Default Facebook Page ID for this ad account (used for creating ads)';

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ad_account_page_id ON user_ad_account(page_id);

-- Migration complete
-- No data migration needed - new accounts will populate this automatically
-- Existing accounts will have NULL page_id until they re-link or manually set it
