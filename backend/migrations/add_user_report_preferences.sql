-- Migration: Add user_report_preferences table
-- Description: Stores user's custom report configuration for My Report feature

CREATE TABLE IF NOT EXISTS user_report_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_metrics TEXT[] DEFAULT ARRAY['spend', 'conversions', 'cpa'],
    chart_type VARCHAR(50) DEFAULT 'none',
    include_recommendations BOOLEAN DEFAULT true,
    email_schedule VARCHAR(20) DEFAULT 'none',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_user_report_preferences_user_id
ON user_report_preferences(user_id);

-- Comment for documentation
COMMENT ON TABLE user_report_preferences IS 'User report preferences for My Report feature - one row per user';
