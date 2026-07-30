"""
Cross-app utility validators and helpers.
"""
import re


TELEGRAM_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{5,32}$")


def validate_telegram_username(username: str) -> str | None:
    """
    Validate a Telegram username (with or without leading @).

    Returns the cleaned username (without @) if valid, otherwise None.
    """
    if not username:
        return None
    cleaned = username.strip().lstrip("@")
    if cleaned and TELEGRAM_USERNAME_RE.match(cleaned):
        return cleaned
    return None
