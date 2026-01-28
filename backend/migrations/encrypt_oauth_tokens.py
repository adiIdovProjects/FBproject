"""
Migration script to encrypt existing OAuth tokens in the database.

Run this ONCE after deploying the encryption feature:
    python -m backend.migrations.encrypt_oauth_tokens

This will encrypt all plaintext tokens currently in the database.
Already-encrypted tokens are skipped (idempotent).
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.utils.db_utils import get_db_engine
from backend.utils.encryption_utils import TokenEncryption
from backend.models.user_schema import User
from sqlalchemy.orm import Session, sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def encrypt_existing_tokens():
    """Encrypt all plaintext OAuth tokens in the database."""

    engine = get_db_engine()
    SessionLocal = sessionmaker(bind=engine)
    db: Session = SessionLocal()

    try:
        # Get all users
        users = db.query(User).all()
        logger.info(f"Found {len(users)} users to process")

        encrypted_count = 0
        skipped_count = 0

        for user in users:
            updated = False

            # Encrypt Facebook token if exists and not already encrypted
            if user.fb_access_token:
                if not TokenEncryption.is_encrypted(user.fb_access_token):
                    logger.info(f"Encrypting Facebook token for user {user.id}")
                    user.fb_access_token = TokenEncryption.encrypt_token(user.fb_access_token)
                    updated = True
                else:
                    skipped_count += 1

            # Encrypt Google tokens if exist and not already encrypted
            if user.google_access_token:
                if not TokenEncryption.is_encrypted(user.google_access_token):
                    logger.info(f"Encrypting Google access token for user {user.id}")
                    user.google_access_token = TokenEncryption.encrypt_token(user.google_access_token)
                    updated = True
                else:
                    skipped_count += 1

            if user.google_refresh_token:
                if not TokenEncryption.is_encrypted(user.google_refresh_token):
                    logger.info(f"Encrypting Google refresh token for user {user.id}")
                    user.google_refresh_token = TokenEncryption.encrypt_token(user.google_refresh_token)
                    updated = True
                else:
                    skipped_count += 1

            if updated:
                encrypted_count += 1

        # Commit all changes
        db.commit()

        logger.info("=" * 60)
        logger.info("✅ Token encryption migration completed")
        logger.info(f"   Users processed: {len(users)}")
        logger.info(f"   Tokens encrypted: {encrypted_count}")
        logger.info(f"   Already encrypted (skipped): {skipped_count}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("🔐 Starting OAuth Token Encryption Migration")
    logger.info("=" * 60)
    encrypt_existing_tokens()
