"""
Run database migration for user_report_preferences table.
Usage: python backend/run_migration.py
Make sure DATABASE_URL environment variable is set to Render's database URL.
"""
import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    print("Get it from Render dashboard > Database > External Database URL")
    exit(1)

migration_sql = """
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

CREATE INDEX IF NOT EXISTS idx_user_report_preferences_user_id
ON user_report_preferences(user_id);

COMMENT ON TABLE user_report_preferences IS 'User report preferences for My Report feature - one row per user';
"""

try:
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Running migration...")
    cur.execute(migration_sql)
    conn.commit()

    print("✓ Migration completed successfully!")
    print("  - Created user_report_preferences table")
    print("  - Created index on user_id")

    cur.close()
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)
