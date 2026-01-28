"""
Error handling utilities for safe error message sanitization.
"""

from backend.config.base_config import settings
import logging

logger = logging.getLogger(__name__)


def sanitize_error_message(error: Exception, generic_message: str, log_context: str = "") -> str:
    """
    Sanitize error messages for safe client responses.

    In production: Returns generic message, logs detailed error
    In development: Returns detailed error for debugging

    Args:
        error: The exception that occurred
        generic_message: Safe generic message to show users
        log_context: Additional context for logging (e.g., "Failed to fetch campaigns")

    Returns:
        Sanitized error message safe to send to client
    """
    error_detail = str(error)

    # Log full error details server-side
    if log_context:
        logger.error(f"{log_context}: {error_detail}", exc_info=True)
    else:
        logger.error(f"Error: {error_detail}", exc_info=True)

    # In production, return generic message only
    if settings.ENVIRONMENT == "production":
        return generic_message

    # In development, return detailed error for debugging
    return f"{generic_message}: {error_detail}"


def get_safe_error_detail(error: Exception, operation: str) -> str:
    """
    Quick helper to get safe error detail for common operations.

    Examples:
        get_safe_error_detail(e, "fetch campaigns")
        get_safe_error_detail(e, "generate AI insights")
    """
    return sanitize_error_message(
        error=error,
        generic_message=f"Failed to {operation}",
        log_context=operation
    )
