-- Migration: Add Magic Link Authentication Support
-- Created: 2026-01-09
-- Description: Adds passwordless magic link authentication and onboarding tracking

-- Add onboarding tracking columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50);

-- Migrate existing users with Facebook connected to mark them as complete
UPDATE users
SET email_verified = TRUE,
    onboarding_completed = TRUE,
    onboarding_step = 'completed'
WHERE fb_user_id IS NOT NULL;

-- Create magic link tokens table
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_magic_link_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_link_email ON magic_link_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_link_used ON magic_link_tokens(used);

-- Add comments for documentation
COMMENT ON TABLE magic_link_tokens IS 'Stores magic link tokens for passwordless authentication';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email via magic link';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user has completed the full onboarding flow';
COMMENT ON COLUMN users.onboarding_step IS 'Current onboarding step: connect_facebook, select_accounts, complete_profile, completed';
