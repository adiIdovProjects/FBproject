-- Migration: Add Business Accounts for Team Collaboration
-- Purpose: Implement three-tier architecture (User → Business → Ad Accounts)
-- Date: 2026-01-08

-- ============================================================
-- STEP 1: Create businesses table
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Create business_members table (many-to-many with roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_members (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);

-- ============================================================
-- STEP 3: Add business_id to user_ad_accounts
-- ============================================================
-- Add column (nullable initially for migration)
ALTER TABLE user_ad_accounts ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_ad_accounts_business_id ON user_ad_accounts(business_id);

-- ============================================================
-- STEP 4: Data Migration - Create default business for each user
-- ============================================================
-- Insert default business for each existing user
INSERT INTO businesses (name, created_at)
SELECT
    CONCAT(COALESCE(full_name, email), '''s Business'),
    NOW()
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM business_members bm WHERE bm.user_id = users.id
);

-- Link each user as owner of their default business
INSERT INTO business_members (business_id, user_id, role, joined_at)
SELECT
    b.id,
    u.id,
    'owner',
    NOW()
FROM users u
CROSS JOIN LATERAL (
    SELECT id FROM businesses
    WHERE name = CONCAT(COALESCE(u.full_name, u.email), '''s Business')
    LIMIT 1
) b
WHERE NOT EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.user_id = u.id AND bm.business_id = b.id
);

-- ============================================================
-- STEP 5: Migrate existing user_ad_accounts to business model
-- ============================================================
-- Update user_ad_accounts to link to user's default business
UPDATE user_ad_accounts uaa
SET business_id = (
    SELECT bm.business_id
    FROM business_members bm
    WHERE bm.user_id = uaa.user_id
    AND bm.role = 'owner'
    LIMIT 1
)
WHERE uaa.business_id IS NULL;

-- ============================================================
-- STEP 6: Add constraints and cleanup
-- ============================================================
-- Now that all existing records have business_id, we can make it NOT NULL
-- (Uncomment after verifying migration succeeded)
-- ALTER TABLE user_ad_accounts ALTER COLUMN business_id SET NOT NULL;

-- ============================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================
-- Check businesses created
-- SELECT COUNT(*) as business_count FROM businesses;

-- Check business members (should equal user count)
-- SELECT COUNT(*) as member_count FROM business_members;

-- Check user_ad_accounts have business_id
-- SELECT COUNT(*) as accounts_with_business FROM user_ad_accounts WHERE business_id IS NOT NULL;
-- SELECT COUNT(*) as accounts_without_business FROM user_ad_accounts WHERE business_id IS NULL;

-- View business structure
-- SELECT
--     b.id as business_id,
--     b.name as business_name,
--     u.full_name as owner_name,
--     u.email as owner_email,
--     COUNT(uaa.id) as linked_accounts
-- FROM businesses b
-- JOIN business_members bm ON b.id = bm.business_id AND bm.role = 'owner'
-- JOIN users u ON bm.user_id = u.id
-- LEFT JOIN user_ad_accounts uaa ON b.id = uaa.business_id
-- GROUP BY b.id, b.name, u.full_name, u.email
-- ORDER BY b.id;
