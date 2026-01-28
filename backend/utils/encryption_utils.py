"""
Encryption utilities for sensitive data at rest.

Uses Fernet (symmetric encryption) from the cryptography library.
Fernet is secure, simple, and FREE to use.
"""

from cryptography.fernet import Fernet
from backend.config.base_config import settings
import base64
import hashlib
import logging

logger = logging.getLogger(__name__)


class TokenEncryption:
    """
    Handles encryption/decryption of OAuth tokens at rest.

    Uses Fernet symmetric encryption with a key derived from JWT_SECRET_KEY.
    This means no additional secrets to manage - reuses existing JWT secret.
    """

    _cipher = None

    @classmethod
    def _get_cipher(cls):
        """Get or create Fernet cipher instance (lazy initialization)."""
        if cls._cipher is None:
            # Derive a 32-byte key from JWT_SECRET_KEY
            key_material = settings.JWT_SECRET_KEY.encode()
            derived_key = hashlib.sha256(key_material).digest()
            # Fernet requires base64-encoded 32-byte key
            fernet_key = base64.urlsafe_b64encode(derived_key)
            cls._cipher = Fernet(fernet_key)
        return cls._cipher

    @classmethod
    def encrypt_token(cls, token: str) -> str:
        """
        Encrypt an OAuth token for storage.

        Args:
            token: Plain text OAuth token

        Returns:
            Encrypted token as string (safe for database storage)
        """
        if not token:
            return ""

        try:
            cipher = cls._get_cipher()
            encrypted_bytes = cipher.encrypt(token.encode())
            # Return as string for database storage
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Token encryption failed: {e}")
            # In case of encryption failure, log error but don't crash
            # This allows graceful degradation (store unencrypted in emergency)
            return token

    @classmethod
    def decrypt_token(cls, encrypted_token: str) -> str:
        """
        Decrypt an OAuth token from storage.

        Args:
            encrypted_token: Encrypted token from database

        Returns:
            Plain text OAuth token

        Note: If decryption fails (e.g., token was stored unencrypted),
              returns the input as-is for backwards compatibility.
        """
        if not encrypted_token:
            return ""

        try:
            cipher = cls._get_cipher()
            decrypted_bytes = cipher.decrypt(encrypted_token.encode())
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            # If decryption fails, assume token is already plaintext (backwards compatibility)
            logger.warning(f"Token decryption failed, assuming plaintext: {e}")
            return encrypted_token

    @classmethod
    def is_encrypted(cls, token: str) -> bool:
        """
        Check if a token appears to be encrypted.
        Fernet tokens start with 'gAAAAA' after base64 encoding.
        """
        if not token:
            return False
        return token.startswith('gAAAAA')
