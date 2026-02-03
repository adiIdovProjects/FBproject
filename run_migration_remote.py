#!/usr/bin/env python3
"""
Run migration on Render PostgreSQL database remotely.
This script connects to your Render database and runs the migration.
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql

def run_migration():
    """Execute the add_business_profiles.sql migration on Render database."""

    # Get database URL from environment or prompt user
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("=" * 60)
        print("DATABASE_URL not found in environment variables")
        print("=" * 60)
        print("\nTo get your Database URL:")
        print("1. Go to https://dashboard.render.com")
        print("2. Click on your PostgreSQL database")
        print("3. Copy the 'External Database URL'")
        print("\nIt should look like:")
        print("postgresql://user:password@host:5432/database")
        print("=" * 60)
        database_url = input("\nPaste your Render Database URL here: ").strip()

    if not database_url:
        print("❌ No database URL provided. Exiting.")
        return False

    migration_file = Path(__file__).parent / "backend" / "migrations" / "add_business_profiles.sql"

    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False

    print("=" * 60)
    print("Running Business Profiles Migration on Render")
    print("=" * 60)

    try:
        # Connect to database
        print("\n[1/3] Connecting to Render database...")
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cursor = conn.cursor()
        print("✓ Connected successfully!")

        # Read migration SQL
        print("\n[2/3] Reading migration file...")
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        print(f"✓ Read {len(sql_content)} characters from migration file")

        # Execute migration
        print("\n[3/3] Executing migration...")
        cursor.execute(sql_content)
        conn.commit()
        print("✓ Migration executed successfully!")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        print("\nChanges applied to Render database:")
        print("  ✓ Created table: business_profiles")
        print("  ✓ Dropped table: account_quiz_responses (if existed)")
        print("  ✓ Created indexes and triggers")
        print("\nYour feature is now LIVE on Render! 🚀")
        print("\nNext steps:")
        print("  1. Test: https://fb-dashboard.onrender.com")
        print("  2. Log in and link an ad account")
        print("  3. You should see the new business profile page")
        print("=" * 60)

        return True

    except psycopg2.Error as e:
        print("\n" + "=" * 60)
        print("❌ Database error occurred!")
        print("=" * 60)
        print(f"Error: {e}")
        print("\nTroubleshooting:")
        print("  1. Verify your Database URL is correct")
        print("  2. Check if your IP is allowed (Render may have IP restrictions)")
        print("  3. Ensure the database is running")
        if conn:
            conn.rollback()
            conn.close()
        return False

    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ Migration failed!")
        print("=" * 60)
        print(f"Error: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False


if __name__ == "__main__":
    print("\n🚀 Remote Migration Script for Render PostgreSQL\n")

    # Check if psycopg2 is installed
    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 is not installed.")
        print("\nPlease install it first:")
        print("  pip install psycopg2-binary")
        print("\nThen run this script again.")
        sys.exit(1)

    success = run_migration()
    sys.exit(0 if success else 1)
