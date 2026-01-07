"""
Simple script to run SQL migrations
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from backend.api.dependencies import engine

def run_migration(migration_file):
    with open(migration_file, 'r') as f:
        sql = f.read()

    with engine.begin() as conn:
        conn.execute(text(sql))

    print(f"Migration {migration_file} applied successfully!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/run_migration.py <migration_file.sql>")
        sys.exit(1)

    run_migration(sys.argv[1])
