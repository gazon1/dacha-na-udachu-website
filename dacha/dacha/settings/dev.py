from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-lbv@cc)c*yssw0^wa@n*hauzik_50&302l5*-w9q)*@cbo8k8x"

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
