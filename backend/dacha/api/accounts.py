"""
Auth API — Telegram Login Widget auth, logout, and current user.

Replaces the old name+phone registration/login system (fully removed).
All endpoints require CSRF via X-CSRFToken header.
"""
import json
import logging
import uuid
from datetime import datetime, timezone as dt_timezone

from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from ninja import Router
from pydantic import BaseModel, HttpUrl

from core.auth import public_auth, session_cookie_auth
from core.models import UserAccount
from core.telegram_auth import verify_telegram_auth
from dacha.settings.base import SESSION_COOKIE_AGE
from django.conf import settings

logger = logging.getLogger(__name__)

router = Router(auth=session_cookie_auth, tags=["auth"])


# ─── Schemas ───────────────────────────────────────────────────────────────────

class TelegramAuthIn(BaseModel):
    """Payload sent by Telegram Login Widget callback."""

    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: HttpUrl | None = None
    auth_date: int
    hash: str


class TelegramAuthOut(BaseModel):
    """Response after successful Telegram login."""

    telegram_id: int
    telegram_username: str | None
    telegram_first_name: str
    telegram_photo_url: str | None
    session_token: str


class MeOut(BaseModel):
    """Current authenticated user profile."""

    telegram_id: int
    telegram_username: str | None
    telegram_first_name: str
    telegram_last_name: str | None
    telegram_photo_url: str | None
    session_token: str


# ─── Helpers ───────────────────────────────────────────────────────────────────

CSRF_TOKEN_HEADER = "X-CSRFToken"


def _set_session_cookie(response: HttpResponse, token: str) -> None:
    """Set httpOnly session cookie on the response."""
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="Lax",
        max_age=SESSION_COOKIE_AGE,
        path="/",
    )


def _clear_session_cookie(response: HttpResponse) -> None:
    """Delete the session cookie."""
    response.delete_cookie(key="session", path="/")


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/telegram/", auth=public_auth)
def telegram_login(request: HttpRequest, data: TelegramAuthIn) -> HttpResponse:
    """
    Verify Telegram widget callback and create/update UserAccount.

    HMAC-SHA256 verification happens here — no HMAC = 401.
    On success: sets httpOnly 'session' cookie + returns JSON.
    """
    # Verify HMAC signature
    ok, reason = verify_telegram_auth(
        data.model_dump(),
        bot_token=settings.TELEGRAM_BOT_TOKEN,
        max_age_seconds=settings.TELEGRAM_AUTH_MAX_AGE_SECONDS,
    )
    if not ok:
        logger.warning("telegram auth failed: %s", reason)
        return HttpResponse("Unauthorized", status=401)

    now = timezone.now()
    photo_url_str = str(data.photo_url) if data.photo_url else None

    # Get or create account by telegram_id
    account, created = UserAccount.objects.update_or_create(
        telegram_id=data.id,
        defaults={
            "telegram_username": data.username or "",
            "telegram_first_name": data.first_name,
            "telegram_last_name": data.last_name or "",
            "telegram_photo_url": photo_url_str or "",
            "auth_date": datetime.fromtimestamp(data.auth_date, tz=dt_timezone.utc),
            "last_seen_at": now,
        },
    )

    # Rotate session token on every login
    account.session_token = uuid.uuid4()
    account.last_seen_at = now
    account.save(update_fields=["session_token", "last_seen_at"])

    logger.info(
        "telegram login: telegram_id=%s username=%s created=%s",
        account.telegram_id,
        account.telegram_username,
        created,
    )

    # Build response
    response_data = {
        "telegram_id": account.telegram_id,
        "telegram_username": account.telegram_username or None,
        "telegram_first_name": account.telegram_first_name,
        "telegram_photo_url": account.telegram_photo_url or None,
        "session_token": str(account.session_token),
    }
    response = HttpResponse(json.dumps(response_data), content_type="application/json")
    _set_session_cookie(response, str(account.session_token))
    return response


@router.post("/logout/")
def logout(request: HttpRequest) -> HttpResponse:
    """Invalidate session token and clear cookie."""
    account = request.auth
    if account is None:
        return HttpResponse("Unauthorized", status=401)

    # Rotate token so old cookie becomes invalid
    account.session_token = uuid.uuid4()
    account.save(update_fields=["session_token"])

    logger.info("telegram logout: telegram_id=%s", account.telegram_id)

    response = HttpResponse(status=204)
    _clear_session_cookie(response)
    return response


@router.get("/me/", response=MeOut, auth=session_cookie_auth)
def me(request: HttpRequest) -> MeOut:
    """Return current authenticated user profile."""
    account = request.auth
    return MeOut(
        telegram_id=account.telegram_id,
        telegram_username=account.telegram_username or None,
        telegram_first_name=account.telegram_first_name,
        telegram_last_name=account.telegram_last_name or None,
        telegram_photo_url=account.telegram_photo_url or None,
        session_token=str(account.session_token),
    )
