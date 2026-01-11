"""
Run the magic link authentication migration
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', '127.0.0.1'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'meta_user'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('POSTGRES_DB', 'meta_analysis')
}

def run_migration():
    """Run the magic link authentication migration"""
    print("Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Read migration file
        migration_file = 'backend/migrations/add_magic_link_auth.sql'
        print(f"Reading migration file: {migration_file}")

        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        print("Executing migration...")
        cursor.execute(sql)
        conn.commit()

        print("SUCCESS: Migration completed successfully!")

        # Verify the changes
        print("\nVerifying changes...")

        # Check if columns were added
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('email_verified', 'onboarding_completed', 'onboarding_step')
        """)
        columns = cursor.fetchall()
        print(f"  Added columns to users table: {[col[0] for col in columns]}")

        # Check if table was created
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'magic_link_tokens'
            )
        """)
        table_exists = cursor.fetchone()[0]
        print(f"  Magic link tokens table created: {table_exists}")

        # Check migrated users
        cursor.execute("""
            SELECT COUNT(*) FROM users WHERE onboarding_completed = TRUE
        """)
        migrated_count = cursor.fetchone()[0]
        print(f"  Existing users marked as onboarded: {migrated_count}")

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
