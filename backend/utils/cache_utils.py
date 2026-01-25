"""
Cache utilities for in-memory caching with TTL and size limits.
"""
import time
from collections import OrderedDict
from typing import Any, Optional, Tuple


class TTLCache:
    """
    Simple in-memory cache with TTL expiration and max size limit.
    Uses LRU eviction when max size is reached.
    """

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 100):
        """
        Initialize cache.

        Args:
            ttl_seconds: Time-to-live for cache entries (default 1 hour)
            max_size: Maximum number of entries (default 100)
        """
        self.ttl = ttl_seconds
        self.max_size = max_size
        self._cache: OrderedDict[str, Tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if exists and not expired."""
        if key not in self._cache:
            return None

        timestamp, value = self._cache[key]
        if time.time() - timestamp > self.ttl:
            del self._cache[key]
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        """Set value in cache with current timestamp."""
        # Remove oldest if at max size
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)

        self._cache[key] = (time.time(), value)
        self._cache.move_to_end(key)

    def delete(self, key: str) -> None:
        """Remove key from cache if exists."""
        if key in self._cache:
            del self._cache[key]

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count of removed entries."""
        now = time.time()
        expired_keys = [
            key for key, (timestamp, _) in self._cache.items()
            if now - timestamp > self.ttl
        ]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None
