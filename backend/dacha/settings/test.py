from .base import *
import os

DEBUG = True
ALLOWED_HOSTS = ["*"]

SECRET_KEY = "test-secret-key-for-ci"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Telegram Login Widget — fixed test token (HMAC verifiable with "123456:TEST")
TELEGRAM_BOT_TOKEN = "123456:TEST"
TELEGRAM_BOT_USERNAME = "TestDachaBot"
TELEGRAM_AUTH_MAX_AGE_SECONDS = 300
