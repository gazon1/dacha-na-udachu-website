from .base import *
from django.core.management.utils import get_random_secret_key

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_random_secret_key()

# SECURITY WARNING: define the correct hosts in production!
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# django-vite — manifest-based (prod; use dev_mode + npm run dev for HMR)
# Vite builds to BASE_DIR / "static"; Django serves it via dacha app static dirs
DJANGO_VITE = {
    "default": {
        "dev_mode": False,
        "manifest_path": PROJECT_DIR / "static" / ".vite" / "manifest.json",
    },
}

try:
    from .local import *
except ImportError:
    pass
