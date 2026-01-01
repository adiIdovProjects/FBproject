import logging
import json
import time
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

class JsonFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings for logs.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "line": record.lineno,
        }

        # Add trace info if available
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_record["user_id"] = record.user_id

        # Add extra fields passed via extra={}
        if hasattr(record, "extra_info"):
            log_record.update(record.extra_info)

        # Include exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)

def setup_logging(level: str = "INFO"):
    """
    Configures the root logger to use JSON formatting.
    """
    root_logger = logging.getLogger()
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(console_handler)

    # Optional: File Handler (only if LOG_FILE is set)
    log_file = os.getenv("LOG_FILE")
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(JsonFormatter())
        root_logger.addHandler(file_handler)

    root_logger.setLevel(level)
    
    # Disable propagation for some noisy libraries if needed
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = True # Let it flow to our root logger

def get_logger(name: str):
    """Return a logger with the given name."""
    return logging.getLogger(name)

# Context-aware logger helper
class LoggerAdapter(logging.LoggerAdapter):
    def process(self, msg: Any, kwargs: Any) -> tuple[Any, Any]:
        extra = kwargs.get("extra", {})
        # Flatten extra info into a specific key for the formatter
        kwargs["extra"] = {"extra_info": extra}
        return msg, kwargs
