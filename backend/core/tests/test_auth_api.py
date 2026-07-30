"""
API integration tests for auth endpoints: POST /api/auth/telegram/, GET /api/auth/me/, POST /api/auth/logout/.
"""
import hashlib
import hmac
import time
import uuid

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from core.models import UserAccount


def _build_telegram_payload(
    bot_token: str,
    *,
    id: int = 123456789,
    first_name: str = "TestUser",
    last_name: str | None = None,
    username: str | None = None,
    photo_url: str | None = None,
    auth_date: int | None = None,
) -> dict:
    """Build a valid Telegram Login Widget payload with correct HMAC."""
    if auth_date is None:
        auth_date = int(time.time())

    raw = {"id": id, "first_name": first_name, "auth_date": auth_date}
    if last_name is not None:
        raw["last_name"] = last_name
    if username is not None:
        raw["username"] = username
    if photo_url is not None:
        raw["photo_url"] = photo_url

    data_pairs = [f"{k}={v}" for k, v in sorted(raw.items()) if k != "hash"]
    data_check_string = "\n".join(data_pairs)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    raw["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return raw


# ─── POST /api/auth/telegram/ ───────────────────────────────────────────────────

def test_telegram_login_creates_account(db, client, settings):
    """First login with a telegram_id creates a new UserAccount."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    payload = _build_telegram_payload("123456:TESTTOKEN", id=111222333, first_name="Alice")
    response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert response.status_code == 200, response.content

    account = UserAccount.objects.get(telegram_id=111222333)
    assert account.telegram_first_name == "Alice"
    assert account.session_token is not None
    # Cookie set
    assert "session" in response.cookies
    assert response.cookies["session"]["httponly"] is True


def test_telegram_login_updates_existing_account(db, client, settings):
    """Re-logging in the same telegram_id updates profile fields and rotates the token."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    # Create initial account
    account = UserAccount.objects.create(
        telegram_id=444555666,
        telegram_first_name="OldName",
        telegram_username="old_handle",
    )
    old_token = account.session_token

    time.sleep(0.01)  # ensure auth_date differs
    payload = _build_telegram_payload(
        "123456:TESTTOKEN",
        id=444555666,
        first_name="NewName",
        username="new_handle",
    )
    response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert response.status_code == 200

    account.refresh_from_db()
    assert account.telegram_first_name == "NewName"
    assert account.telegram_username == "new_handle"
    assert account.session_token != old_token


def test_telegram_login_invalid_hash_returns_401(db, client, settings):
    """Bad HMAC → 401."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    payload = _build_telegram_payload("123456:TESTTOKEN", id=777888999)
    payload["hash"] = "deadbeefdeadbeef"
    response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert response.status_code == 401


def test_telegram_login_expired_auth_date_returns_401(db, client, settings):
    """auth_date older than max_age_seconds → 401."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    settings.TELEGRAM_AUTH_MAX_AGE_SECONDS = 300
    old_timestamp = int(time.time()) - 600
    payload = _build_telegram_payload(
        "123456:TESTTOKEN", id=100200300, auth_date=old_timestamp
    )
    response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert response.status_code == 401


def test_telegram_login_wrong_bot_token_returns_401(db, client, settings):
    """Signing with wrong token → 401."""
    settings.TELEGRAM_BOT_TOKEN = "correct-token"
    payload = _build_telegram_payload("wrong-token", id=555666777)
    response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert response.status_code == 401


# ─── GET /api/auth/me/ ─────────────────────────────────────────────────────────

def test_me_without_session_returns_401(db, client):
    """No session cookie → 401."""
    response = client.get("/api/auth/me/")
    assert response.status_code == 401


def test_me_with_valid_session_returns_user(db, client, settings):
    """Valid session cookie → user profile."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    # Create account with known token
    account = UserAccount.objects.create(
        telegram_id=998877665,
        telegram_first_name="Bob",
        telegram_username="bob_the_dev",
        telegram_last_name="Johnson",
    )
    client.cookies["session"] = str(account.session_token)

    response = client.get("/api/auth/me/")
    assert response.status_code == 200
    data = response.json()
    assert data["telegram_id"] == 998877665
    assert data["telegram_first_name"] == "Bob"
    assert data["telegram_username"] == "bob_the_dev"
    assert data["telegram_last_name"] == "Johnson"


def test_me_with_invalid_session_token_returns_401(db, client):
    """Non-existent session token → 401."""
    client.cookies["session"] = str(uuid.uuid4())
    response = client.get("/api/auth/me/")
    assert response.status_code == 401


# ─── POST /api/auth/logout/ ─────────────────────────────────────────────────────

def test_logout_invalidates_session(db, client, settings):
    """Logout rotates the token and clears the cookie."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    account = UserAccount.objects.create(
        telegram_id=112233445,
        telegram_first_name="Charlie",
    )
    old_token = account.session_token
    client.cookies["session"] = str(old_token)

    response = client.post("/api/auth/logout/")
    assert response.status_code == 204
    # Old cookie cleared
    assert response.cookies["session"].value == ""

    # Old token no longer works
    response2 = client.get("/api/auth/me/")
    assert response2.status_code == 401

    # New token works
    account.refresh_from_db()
    client.cookies["session"] = str(account.session_token)
    response3 = client.get("/api/auth/me/")
    assert response3.status_code == 200


def test_logout_without_session_returns_401(db, client):
    """No session → 401."""
    response = client.post("/api/auth/logout/")
    assert response.status_code == 401


# ─── Auth flow: login → me → logout → me ───────────────────────────────────────

def test_full_auth_flow(db, client, settings):
    """Complete login → me → logout → me returns 401 flow."""
    settings.TELEGRAM_BOT_TOKEN = "123456:TESTTOKEN"
    payload = _build_telegram_payload(
        "123456:TESTTOKEN",
        id=123123123,
        first_name="Diana",
        username="diana_dev",
    )
    login_response = client.post("/api/auth/telegram/", data=payload, content_type="application/json")
    assert login_response.status_code == 200

    me_response = client.get("/api/auth/me/")
    assert me_response.status_code == 200
    assert me_response.json()["telegram_id"] == 123123123

    logout_response = client.post("/api/auth/logout/")
    assert logout_response.status_code == 204

    me_after_response = client.get("/api/auth/me/")
    assert me_after_response.status_code == 401
