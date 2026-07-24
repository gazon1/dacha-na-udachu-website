"""
Re-exports from core.http_utils for backwards compatibility.
All new code should import directly from core.http_utils.
"""
from core.http_utils import (
    htmx_error,
    htmx_success,
    htmx_trigger,
    htmx_toast,
    htmx_error_from_messages,
    htmx_success_from_messages,
)

__all__ = [
    "htmx_error",
    "htmx_success",
    "htmx_trigger",
    "htmx_toast",
    "htmx_error_from_messages",
    "htmx_success_from_messages",
]
