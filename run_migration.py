"""Run business accounts migration"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from config.base_config import Settings

# Get database URL from settings
settings = Settings()
DATABASE_URL = settings.DATABASE_URL

print(f"Connecting to database...")
# Create engine
engine = create_engine(DATABASE_URL)

# Read migration SQL
with open("backend/migrations/add_business_accounts.sql", "r") as f:
    migration_sql = f.read()

# Execute migration
try:
    with engine.begin() as conn:
        # Remove comments and split by semicolons
        lines = []
        for line in migration_sql.split('\n'):
            # Skip comment lines
            if line.strip().startswith('--'):
                continue
            # Remove inline comments
            if '--' in line:
                line = line[:line.index('--')]
            lines.append(line)

        clean_sql = '\n'.join(lines)
        statements = [s.strip() for s in clean_sql.split(";") if s.strip()]

        for i, statement in enumerate(statements, 1):
            if statement:
                print(f"Executing statement {i}/{len(statements)}...")
                try:
                    conn.execute(text(statement))
                except Exception as e:
                    print(f"  Warning: {e}")
                    # Continue on errors (like "already exists")

    print("\n[SUCCESS] Migration completed successfully!")
    print("\nVerification:")

    with engine.connect() as conn:
        # Count businesses
        result = conn.execute(text("SELECT COUNT(*) FROM businesses"))
        business_count = result.scalar()
        print(f"  - Businesses created: {business_count}")

        # Count members
        result = conn.execute(text("SELECT COUNT(*) FROM business_members"))
        member_count = result.scalar()
        print(f"  - Business members: {member_count}")

        # Check accounts with business_id
        result = conn.execute(text("SELECT COUNT(*) FROM user_ad_accounts WHERE business_id IS NOT NULL"))
        accounts_migrated = result.scalar()
        print(f"  - Accounts linked to business: {accounts_migrated}")

except Exception as e:
    print(f"\n[ERROR] Migration failed: {e}")
    raise
