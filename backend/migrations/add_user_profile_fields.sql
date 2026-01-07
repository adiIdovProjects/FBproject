-- Migration: Add user profile fields
-- Created: 2026-01-07
-- Description: Add job_title, years_experience, and referral_source columns to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_experience VARCHAR(50),
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);

COMMENT ON COLUMN users.job_title IS 'User job title (e.g., Marketing Manager, CMO, Founder)';
COMMENT ON COLUMN users.years_experience IS 'Years of advertising experience (e.g., <1 year, 1-3 years, 3-5 years, 5+ years)';
COMMENT ON COLUMN users.referral_source IS 'How the user heard about us (e.g., Google Search, Facebook Ad, Referral)';
