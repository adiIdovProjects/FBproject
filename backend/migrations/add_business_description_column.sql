-- Migration: Add business_description column to account_quiz_responses
-- Purpose: Store free-text business context for AI-powered insights
-- Date: 2026-01-12

-- Add business_description column if it doesn't exist
ALTER TABLE account_quiz_responses
ADD COLUMN IF NOT EXISTS business_description TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN account_quiz_responses.business_description IS 'Free-text description of the business for AI context and personalized insights';

-- Migration complete
