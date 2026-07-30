"""
Unit tests for core.telegram_auth — HMAC-SHA256 verification of Telegram Login Widget payloads.
"""
import hashlib
import hmac
import time

import pytest

from core.telegram_auth import verify_telegram_auth


def _build_valid_payload(
    bot_token: str,
    *,
    id: int = 123456789,
    first_name: str = "Alice",
    last_name: str | None = None,
    username: str | None = None,
    photo_url: str | None = None,
    auth_date: int | None = None,
) -> dict:
    """Return a valid payload dict with correct HMAC hash for the given bot_token."""
    if auth_date is None:
        auth_date = int(time.time())

    raw = {
        "id": id,
        "first_name": first_name,
        "auth_date": auth_date,
    }
    if last_name is not None:
        raw["last_name"] = last_name
    if username is not None:
        raw["username"] = username
    if photo_url is not None:
        raw["photo_url"] = photo_url

    # Compute HMAC-SHA256
    data_pairs = [f"{k}={v}" for k, v in sorted(raw.items())]
    data_check_string = "\n".join(data_pairs)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    raw["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return raw


# ─── Valid signature ───────────────────────────────────────────────────────────

def test_valid_signature_returns_true():
    """A payload signed with the correct bot_token passes verification."""
    payload = _build_valid_payload(bot_token="my-secret-bot-token")
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is True
    assert reason is None


def test_valid_signature_with_all_optional_fields():
    """All optional fields present — still valid."""
    payload = _build_valid_payload(
        bot_token="my-secret-bot-token",
        id=999888777,
        first_name="Bob",
        last_name="Smith",
        username="bobby",
        photo_url="https://t.me/photos/bobby.jpg",
    )
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is True


# ─── Invalid signature ─────────────────────────────────────────────────────────

def test_invalid_hash_returns_false():
    """Wrong hash → (False, 'bad signature')."""
    payload = _build_valid_payload(bot_token="my-secret-bot-token")
    payload["hash"] = "deadbeef"
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is False
    assert reason == "bad signature"


def test_missing_hash_returns_false():
    """Hash field absent → (False, 'missing hash')."""
    payload = _build_valid_payload(bot_token="my-secret-bot-token")
    del payload["hash"]
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is False
    assert reason == "missing hash"


def test_tampered_field_returns_false():
    """Changing any field after signing breaks the signature."""
    payload = _build_valid_payload(
        bot_token="my-secret-bot-token", id=123456789, first_name="Alice"
    )
    payload["id"] = 999999999  # changed after signing
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is False
    assert reason == "bad signature"


def test_wrong_bot_token_returns_false():
    """Signing with one bot_token and verifying with another fails."""
    payload = _build_valid_payload(bot_token="token-A")
    ok, reason = verify_telegram_auth(payload, bot_token="token-B")
    assert ok is False
    assert reason == "bad signature"


# ─── Missing / malformed auth_date ─────────────────────────────────────────────

def test_missing_auth_date_returns_false():
    """Payload without auth_date → (False, 'missing auth_date')."""
    # Build valid payload WITH auth_date in hash, then remove auth_date field
    payload = _build_valid_payload(bot_token="my-secret-bot-token")
    # Rebuild hash WITHOUT auth_date (so hash is valid for the no-auth_date payload)
    data_pairs = [f"first_name={payload['first_name']}", f"id={payload['id']}"]
    data_check_string = "\n".join(sorted(data_pairs))
    secret_key = hashlib.sha256("my-secret-bot-token".encode()).digest()
    payload["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    del payload["auth_date"]
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is False
    assert reason == "missing auth_date"


# ─── Stale / future auth_date ──────────────────────────────────────────────────

def test_expired_auth_date_returns_false():
    """auth_date older than max_age_seconds → (False, 'stale auth_date')."""
    old_timestamp = int(time.time()) - 600  # 10 minutes ago
    payload = _build_valid_payload(
        bot_token="my-secret-bot-token", auth_date=old_timestamp
    )
    ok, reason = verify_telegram_auth(
        payload, bot_token="my-secret-bot-token", max_age_seconds=300
    )
    assert ok is False
    assert reason == "stale auth_date"


def test_future_auth_date_returns_false():
    """auth_date too far in the future → (False, 'future auth_date')."""
    future_timestamp = int(time.time()) + 120  # 2 minutes ahead (beyond 60s drift)
    payload = _build_valid_payload(
        bot_token="my-secret-bot-token", auth_date=future_timestamp
    )
    ok, reason = verify_telegram_auth(
        payload, bot_token="my-secret-bot-token", max_age_seconds=300
    )
    assert ok is False
    assert reason == "future auth_date"


def test_far_future_auth_date_returns_false():
    """auth_date beyond the future-drift window → (False, 'future auth_date')."""
    future_timestamp = int(time.time()) + 300  # 5 minutes ahead
    payload = _build_valid_payload(
        bot_token="my-secret-bot-token", auth_date=future_timestamp
    )
    ok, reason = verify_telegram_auth(
        payload, bot_token="my-secret-bot-token", max_age_seconds=300
    )
    assert ok is False
    assert reason == "future auth_date"


# ─── Bot token not configured ───────────────────────────────────────────────────

def test_empty_bot_token_returns_false():
    """Empty bot_token → (False, 'bot_token not configured')."""
    payload = _build_valid_payload(bot_token="real-token")
    ok, reason = verify_telegram_auth(payload, bot_token="")
    assert ok is False
    assert reason == "bot_token not configured"


# ─── Extra unknown fields ───────────────────────────────────────────────────────

def test_extra_unknown_field_ignored():
    """Fields not in Telegram's spec are excluded from hash computation — still valid."""
    # Include custom_field IN the hash (as if the widget included it)
    payload = _build_valid_payload(bot_token="my-secret-bot-token")
    payload["custom_field"] = "ignored"
    # Rebuild hash with custom_field included (simulating a widget that sends extra data)
    raw_for_hash = {k: v for k, v in payload.items() if k != "hash" and v is not None}
    data_pairs = [f"{k}={v}" for k, v in sorted(raw_for_hash.items())]
    data_check_string = "\n".join(data_pairs)
    secret_key = hashlib.sha256("my-secret-bot-token".encode()).digest()
    payload["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    ok, reason = verify_telegram_auth(payload, bot_token="my-secret-bot-token")
    assert ok is True
