"""
Magic Link Repository - Database operations for magic link tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
from jose import jwt
from backend.config.base_config import settings
import secrets


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
        insert_query = """
            INSERT INTO magic_link_tokens (email, token, expires_at, used)
            VALUES (:email, :token, :expires_at, FALSE)
        """

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
                print(f"Invalid token type: {token_type}")
                return None

            # Check if token exists in database and hasn't been used
            check_query = """
                SELECT email, used, expires_at
                FROM magic_link_tokens
                WHERE token = :token
            """

            result = self.db.execute(check_query, {"token": token}).fetchone()

            if not result:
                print(f"Token not found in database: {token[:20]}...")
                return None

            db_email, used, expires_at = result

            # Check if already used
            if used:
                print(f"Token already used for {email}")
                return None

            # Check expiry (redundant with JWT but extra security)
            if expires_at < datetime.utcnow():
                print(f"Token expired for {email}")
                return None

            # Mark token as used
            update_query = """
                UPDATE magic_link_tokens
                SET used = TRUE
                WHERE token = :token
            """

            self.db.execute(update_query, {"token": token})
            self.db.commit()

            return email

        except jwt.ExpiredSignatureError:
            print("Token has expired (JWT validation)")
            return None
        except jwt.JWTError as e:
            print(f"Invalid token (JWT error): {e}")
            return None
        except Exception as e:
            print(f"Error verifying token: {e}")
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

        delete_query = """
            DELETE FROM magic_link_tokens
            WHERE expires_at < :cutoff_date OR used = TRUE
        """

        result = self.db.execute(delete_query, {"cutoff_date": cutoff_date})
        self.db.commit()

        deleted_count = result.rowcount
        print(f"Cleaned up {deleted_count} old/used magic link tokens")

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
            query = """
                SELECT email, expires_at, used, created_at
                FROM magic_link_tokens
                WHERE token = :token
            """

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
            print(f"Error getting token info: {e}")
            return None
