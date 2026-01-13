-- Set all existing user_ad_account records to 'admin' permission
-- This ensures backward compatibility for existing users
UPDATE user_ad_account
SET permission_level = 'admin'
WHERE permission_level IS NULL OR permission_level = '';

-- Verify the update
SELECT COUNT(*) as admin_count
FROM user_ad_account
WHERE permission_level = 'admin';
