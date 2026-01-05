from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class AppException(HTTPException):
    """Base exception for application errors."""
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class DatabaseError(AppException):
    """Raised when a database operation fails."""
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )

class ValidationError(AppException):
    """Raised when input validation fails."""
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class ExternalAPIError(AppException):
    """Raised when an external API call fails."""
    def __init__(self, detail: str = "External API call failed"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail
        )
