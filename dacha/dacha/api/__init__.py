"""
dacha.api — Django Ninja JSON API for the Next.js headless frontend.

All endpoints live under /api/ and require CSRF for mutating requests.
Read-only endpoints (GET) are open (CORS is handled by django-cors-headers).

Wagtail page content comes from /api/v2/ (wagtail.api.v2, separate router).
"""
from ninja import NinjaAPI
from django.http import HttpRequest

api = NinjaAPI(
    title="Dacha API",
    description="Headless JSON API for the Next.js frontend. "
                "Wagtail page content: /api/v2/",
    version="1.0.0",
    urls_namespace="ninja-api",
)

# Import routers to register them with the API
from dacha.api.booking import router as booking_router
from dacha.api.events import router as events_router
from dacha.api.pages import router as pages_router
from dacha.api.newsletter import router as newsletter_router
from dacha.api.accounts import router as accounts_router

api.add_router("/booking/", booking_router)
api.add_router("/events/", events_router)
api.add_router("/pages/", pages_router)
api.add_router("/newsletter/", newsletter_router)
api.add_router("/auth/", accounts_router)
