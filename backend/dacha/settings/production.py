from .base import *
import os

STATIC_ROOT = "/workspace/staticfiles"

DEBUG = False

# Allow the Wagtail admin to embed its own preview iframe.
# wagtail_headless_preview does not override X-Frame-Options the way Wagtail's
# built-in preview does, so without this the preview iframe is blocked by the
# browser ("server error" inside the admin). SAMEORIGIN is sufficient now that
# admin and frontend share a single domain (dacha.maxdrobin.ru).
X_FRAME_OPTIONS = "SAMEORIGIN"

# SECRET_KEY — must be set via environment in production
SECRET_KEY = os.environ.get("SECRET_KEY")

# Database from environment
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB"),
        "USER": os.environ.get("POSTGRES_USER"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
        "HOST": os.environ.get("POSTGRES_HOST"),
        "PORT": os.environ.get("POSTGRES_PORT"),
        "CONN_MAX_AGE": 60,
    }
}

# ManifestStaticFilesStorage for cache-busting
STORAGES["staticfiles"]["BACKEND"] = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

# Redis-backed cache for django-ratelimit (shared across gunicorn workers).
# Falls back to LocMemCache if REDIS_URL is not set.
_redis_url = os.environ.get("REDIS_URL", "")
if _redis_url:
    CACHES["default"] = {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_url,
    }

# Security settings — disable for local DEBUG mode
DEBUG_PROD = os.environ.get("DEBUG_PROD", "false").lower() in ("1", "true", "yes")
if not DEBUG_PROD:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# CSP — Content Security Policy (django-csp 4.x format)
CONTENT_SECURITY_POLICY = {
    "default-src": ("'self'",),
    "script-src": ("'self'", "'nonce'", "https://telegram.org"),
    "style-src": ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com"),
    "font-src": ("'self'", "https://fonts.gstatic.com"),
    "img-src": ("'self'", "data:", "https:", "blob:"),
    "connect-src": ("'self'",),
    "frame-ancestors": ("'none'",),
    "frame-src": ("https://oauth.telegram.org", "https://telegram.org"),
    "base-uri": ("'self'",),
    "form-action": ("'self'",),
}

# CSRF
CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS", SITE_URL
).split(",")

# CORS — Next.js production domain
_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", SITE_URL)
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
CORS_ALLOW_CREDENTIALS = True

# ALLOWED_HOSTS
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "dacha.maxdrobin.ru").split(",")

# Email via environment
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

# JSON logging for Coolify
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "mail_admins": {
            "class": "django.utils.log.AdminEmailHandler",
            "include_html": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.request": {
            "handlers": ["mail_admins"],
            "level": "ERROR",
            "propagate": False,
        },
        "core": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

try:
    from .local import *
except ImportError:
    pass
