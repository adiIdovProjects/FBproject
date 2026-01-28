"""
CSRF Protection Utilities

Provides CSRF token generation and validation for state-changing requests.
"""

import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional
from backend.config.base_config import settings


class CSRFProtection:
    """
    Simple CSRF protection using double-submit cookie pattern.

    How it works:
    1. Server generates a random CSRF token and sets it as a cookie
    2. Client must send the same token in a custom header (X-CSRF-Token)
    3. Server validates that cookie and header match

    This prevents CSRF because:
    - Attacker's malicious site cannot read cookies from your domain (Same-Origin Policy)
    - Attacker cannot set custom headers on cross-origin requests
    """

    TOKEN_LENGTH = 32  # 256 bits of entropy
    TOKEN_LIFETIME_HOURS = 24

    @staticmethod
    def generate_token() -> str:
        """Generate a cryptographically secure CSRF token."""
        return secrets.token_urlsafe(CSRFProtection.TOKEN_LENGTH)

    @staticmethod
    def create_signed_token(token: str) -> str:
        """
        Create a signed token with timestamp for expiration checking.
        Format: {timestamp}:{token}:{signature}
        """
        timestamp = int(datetime.utcnow().timestamp())
        message = f"{timestamp}:{token}"
        signature = hmac.new(
            settings.JWT_SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{timestamp}:{token}:{signature}"

    @staticmethod
    def validate_signed_token(signed_token: str) -> bool:
        """
        Validate a signed CSRF token.
        Returns True if valid and not expired, False otherwise.
        """
        try:
            parts = signed_token.split(":")
            if len(parts) != 3:
                return False

            timestamp_str, token, provided_signature = parts
            timestamp = int(timestamp_str)

            # Check expiration
            token_age = datetime.utcnow().timestamp() - timestamp
            if token_age > (CSRFProtection.TOKEN_LIFETIME_HOURS * 3600):
                return False

            # Verify signature
            message = f"{timestamp}:{token}"
            expected_signature = hmac.new(
                settings.JWT_SECRET_KEY.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()

            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(provided_signature, expected_signature)

        except (ValueError, IndexError):
            return False

    @staticmethod
    def validate_request(cookie_token: Optional[str], header_token: Optional[str]) -> bool:
        """
        Validate CSRF protection by comparing cookie and header tokens.

        Args:
            cookie_token: Token from csrf_token cookie
            header_token: Token from X-CSRF-Token header

        Returns:
            True if both tokens are present, valid, and match
        """
        if not cookie_token or not header_token:
            return False

        # Validate the signed cookie token
        if not CSRFProtection.validate_signed_token(cookie_token):
            return False

        # Extract the token part from signed cookie
        try:
            _, cookie_token_value, _ = cookie_token.split(":")
        except (ValueError, IndexError):
            return False

        # Compare header token with cookie token (constant-time)
        return hmac.compare_digest(header_token, cookie_token_value)
