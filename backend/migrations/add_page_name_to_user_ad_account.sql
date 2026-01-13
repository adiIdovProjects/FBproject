-- Add page_name column to user_ad_account table
-- This allows storing the Facebook Page name for display in the UI

ALTER TABLE user_ad_account
ADD COLUMN IF NOT EXISTS page_name VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN user_ad_account.page_name IS 'Facebook Page name associated with this ad account';
