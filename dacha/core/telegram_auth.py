"""
Telegram Login Widget — verify HMAC-SHA256 signature.

Spec: https://core.telegram.org/bots/telegram-login#authorization-of-the-user
"""
import hashlib
import hmac
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# Allow 1 minute clock drift into the future
_FUTURE_DRIFT_SECONDS = 60


def verify_telegram_auth(
    payload: dict[str, Any],
    bot_token: str,
    max_age_seconds: int = 300,
) -> tuple[bool, str | None]:
    """
    Verify Telegram Login Widget payload.

    Returns (ok, reason):
      (True, None)          — valid
      (False, "reason")    — invalid with human-readable reason
    """
    reason: str | None = None

    # bot_token must be configured
    if not bot_token:
        logger.warning("telegram auth: bot_token not configured")
        reason = "bot_token not configured"

    # hash field is required
    elif not (received_hash := payload.get("hash")):
        logger.warning("telegram auth: missing hash field")
        reason = "missing hash"

    else:
        # Build data-check-string: all fields except hash and None-valued fields,
        # sorted alphabetically, \n-separated.
        # Telegram widget only sends fields that have a value — None fields are omitted.
        data_pairs = [
            f"{key}={value}"
            for key, value in sorted(payload.items())
            if key != "hash" and value is not None
        ]
        data_check_string = "\n".join(data_pairs)

        # Compute expected HMAC-SHA256
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        expected_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_hash, received_hash):
            logger.warning("telegram auth: bad signature")
            reason = "bad signature"

    if reason is None:
        # Check auth_date freshness
        auth_date = payload.get("auth_date")
        if auth_date is None:
            logger.warning("telegram auth: missing auth_date")
            reason = "missing auth_date"
        else:
            try:
                auth_date_int = int(auth_date)
            except (TypeError, ValueError):
                logger.warning("telegram auth: auth_date is not an integer")
                reason = "auth_date must be integer"
            else:
                now = int(time.time())
                age = now - auth_date_int
                if age > max_age_seconds:
                    logger.warning(
                        "telegram auth: stale auth_date (age=%d > max=%d)",
                        age,
                        max_age_seconds,
                    )
                    reason = "stale auth_date"
                elif age < -_FUTURE_DRIFT_SECONDS:
                    logger.warning("telegram auth: future auth_date (age=%d)", age)
                    reason = "future auth_date"

    return reason is None, reason
