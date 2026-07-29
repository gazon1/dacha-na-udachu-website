"""
Django Ninja authentication via session cookie or X-Session-Token header.
Replaces the old X-User-Token (UUID in header, stored in localStorage).
"""
import logging
import uuid

from django.http import HttpRequest
from ninja.security import APIKeyCookie, APIKeyHeader

from core.models import UserAccount

logger = logging.getLogger(__name__)


# ─── Session Cookie Auth ───────────────────────────────────────────────────────

class SessionCookieAuth(APIKeyCookie):
    """
    Reads the 'session' cookie and returns the associated UserAccount.
    Returns None if cookie is missing or session_token is invalid.
    Ninja auto-returns 401 on None.
    """

    def authenticate(self, request: HttpRequest, key: str) -> UserAccount | None:
        # Read directly from COOKIES — DualSessionAuth already extracted the value,
        # but APIKeyCookie also calls this directly (param_name='session').
        if not key:
            key = request.COOKIES.get("session", "")
        if not key:
            return None
        try:
            parsed = uuid.UUID(key)
        except ValueError:
            return None
        return UserAccount.objects.filter(session_token=parsed).first()


# ─── Session Header Auth (for bots / cron jobs) ────────────────────────────────

class SessionHeaderAuth(APIKeyHeader):
    """
    Reads the 'X-Session-Token' header.
    Same logic as cookie auth — useful for programmatic API access.
    """

    param_name = "X-Session-Token"

    def authenticate(self, request: HttpRequest, key: str) -> UserAccount | None:
        try:
            parsed = uuid.UUID(key)
        except ValueError:
            return None
        return UserAccount.objects.filter(session_token=parsed).first()


# ─── Dual Auth (cookie first, then header) ─────────────────────────────────────

class DualSessionAuth:
    """
    Tries cookie auth first, falls back to header auth.
    Used as the primary auth backend for all protected endpoints.
    """

    def __call__(self, request: HttpRequest) -> UserAccount | None:
        # Try cookie first
        session_key = request.COOKIES.get("session", "")
        if session_key:
            result = SessionCookieAuth().authenticate(request, session_key)
            if result:
                return result

        # Fall back to X-Session-Token header
        header_key = request.headers.get("X-Session-Token", "")
        if header_key:
            result = SessionHeaderAuth().authenticate(request, header_key)
            if result:
                return result

        return None


# ─── Public Auth (no auth required) ───────────────────────────────────────────

class PublicAuth:
    """
    Always returns True — marks an endpoint as publicly accessible.
    The router-level auth=session_cookie_auth is overridden per-endpoint with
    auth=public_auth so the endpoint is accessible without credentials.
    Views that use this must NOT access request.auth (it will be True).
    """

    def __call__(self, _request: HttpRequest) -> bool:
        return True


# ─── Singletons ────────────────────────────────────────────────────────────────

session_cookie_auth = DualSessionAuth()
public_auth = PublicAuth()
