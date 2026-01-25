"""
Magic Link Repository - Database operations for magic link tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text
from jose import jwt
from backend.config.base_config import settings
from backend.utils.logging_utils import get_logger
import secrets

logger = get_logger(__name__)


class MagicLinkRepository:
    """Repository for managing magic link authentication tokens"""

    def __init__(self, db: Session):
        self.db = db

    def create_token(self, email: str, expiry_minutes: int = None) -> str:
        """
        Generate a magic link token for the given email

        Args:
            email: User's email address
            expiry_minutes: Token expiry time in minutes (defaults to config setting)

        Returns:
            str: Generated token
        """
        if expiry_minutes is None:
            expiry_minutes = settings.MAGIC_LINK_EXPIRY_MINUTES

        # Generate token with JWT
        expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)

        payload = {
            "email": email,
            "exp": expires_at,
            "type": "magic_link",
            "jti": secrets.token_urlsafe(16)  # Unique token ID
        }

        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

        # Store token in database
        insert_query = text("""
            INSERT INTO magic_link_tokens (email, token, expires_at, used)
            VALUES (:email, :token, :expires_at, FALSE)
        """)

        self.db.execute(
            insert_query,
            {
                "email": email,
                "token": token,
                "expires_at": expires_at
            }
        )
        self.db.commit()

        return token

    def verify_token(self, token: str) -> Optional[str]:
        """
        Verify a magic link token and return the associated email

        Args:
            token: The magic link token to verify

        Returns:
            Optional[str]: Email address if valid, None otherwise
        """
        try:
            # Decode JWT
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )

            email = payload.get("email")
            token_type = payload.get("type")

            # Verify token type
            if token_type != "magic_link":
                logger.warning(f"Invalid token type: {token_type}")
                return None

            # Atomically mark token as used and return email if valid
            # This prevents race conditions where the same token could be used twice
            update_query = text("""
                UPDATE magic_link_tokens
                SET used = TRUE
                WHERE token = :token
                  AND used = FALSE
                  AND expires_at >= :now
                RETURNING email
            """)

            result = self.db.execute(
                update_query,
                {"token": token, "now": datetime.utcnow()}
            ).fetchone()
            self.db.commit()

            if not result:
                logger.warning(f"Token not found, already used, or expired for {email}")
                return None

            return result[0]

        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired (JWT validation)")
            return None
        except jwt.JWTError as e:
            logger.warning(f"Invalid token (JWT error): {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    def cleanup_expired_tokens(self, days_old: int = 7) -> int:
        """
        Delete expired tokens older than specified days

        Args:
            days_old: Delete tokens older than this many days

        Returns:
            int: Number of tokens deleted
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        delete_query = text("""
            DELETE FROM magic_link_tokens
            WHERE expires_at < :cutoff_date OR used = TRUE
        """)

        result = self.db.execute(delete_query, {"cutoff_date": cutoff_date})
        self.db.commit()

        deleted_count = result.rowcount
        logger.info(f"Cleaned up {deleted_count} old/used magic link tokens")

        return deleted_count

    def get_token_info(self, token: str) -> Optional[Dict]:
        """
        Get information about a token (for debugging)

        Args:
            token: The token to inspect

        Returns:
            Optional[Dict]: Token information or None
        """
        try:
            query = text("""
                SELECT email, expires_at, used, created_at
                FROM magic_link_tokens
                WHERE token = :token
            """)

            result = self.db.execute(query, {"token": token}).fetchone()

            if not result:
                return None

            email, expires_at, used, created_at = result

            return {
                "email": email,
                "expires_at": expires_at,
                "used": used,
                "created_at": created_at,
                "is_expired": expires_at < datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error getting token info: {e}")
            return None
