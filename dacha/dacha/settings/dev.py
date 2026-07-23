from .base import *
from pathlib import Path

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-lbv@cc)c*yssw0^wa@n*hauzik_50&302l5*-w9q)*@cbo8k8x"

# SECURITY WARNING: define the correct hosts in production!
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Add static assets from frontend build
STATICFILES_DIRS = [
    *STATICFILES_DIRS,
    BASE_DIR.parent / "static",
]


try:
    from .local import *
except ImportError:
    pass
