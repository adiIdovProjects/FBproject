#!/usr/bin/env python3
"""
Run the business_profiles migration script.
This will create the business_profiles table and drop the old account_quiz_responses table.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Execute the add_business_profiles.sql migration."""

    migration_file = project_root / "backend" / "migrations" / "add_business_profiles.sql"

    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        return False

    logger.info("=" * 60)
    logger.info("Running Business Profiles Migration")
    logger.info("=" * 60)

    try:
        # Get database engine
        logger.info("Connecting to database...")
        engine = get_db_engine()

        # Read migration SQL
        logger.info(f"Reading migration file: {migration_file}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Split into individual statements (handle multi-statement SQL)
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]

        logger.info(f"Found {len(statements)} SQL statements to execute")

        # Execute each statement
        with engine.connect() as conn:
            for i, statement in enumerate(statements, 1):
                # Skip empty statements and comments
                if not statement or statement.startswith('--'):
                    continue

                logger.info(f"Executing statement {i}/{len(statements)}...")
                logger.debug(f"SQL: {statement[:100]}...")

                try:
                    conn.execute(text(statement))
                    conn.commit()
                    logger.info(f"✓ Statement {i} executed successfully")
                except Exception as e:
                    # Some statements may fail if already executed (like DROP TABLE IF EXISTS)
                    # This is okay for idempotent migrations
                    if "does not exist" in str(e) or "already exists" in str(e):
                        logger.warning(f"⚠ Statement {i} skipped (already applied): {str(e)[:100]}")
                    else:
                        logger.error(f"✗ Statement {i} failed: {e}")
                        raise

        logger.info("=" * 60)
        logger.info("✓ Migration completed successfully!")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Changes applied:")
        logger.info("  ✓ Created table: business_profiles")
        logger.info("  ✓ Dropped table: account_quiz_responses (if existed)")
        logger.info("  ✓ Created indexes and triggers")
        logger.info("")
        logger.info("Next steps:")
        logger.info("  1. Start backend: uvicorn backend.api.main:app --reload")
        logger.info("  2. Start frontend: cd meta-dashboard && npm run dev")
        logger.info("  3. Test onboarding flow with business profile step")
        logger.info("")

        return True

    except Exception as e:
        logger.error("=" * 60)
        logger.error("✗ Migration failed!")
        logger.error("=" * 60)
        logger.error(f"Error: {e}")
        logger.error("")
        logger.error("Troubleshooting:")
        logger.error("  1. Check DATABASE_URL environment variable is set")
        logger.error("  2. Verify database is accessible")
        logger.error("  3. Check .env file in project root")
        logger.error("")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
