-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set admin users by email (update with your admin emails)
-- UPDATE users SET is_admin = TRUE WHERE email IN ('admin@example.com');
