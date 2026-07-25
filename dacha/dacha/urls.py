from django.conf import settings
from django.urls import include, path
from django.contrib import admin
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.views.decorators.http import require_POST
from django_ratelimit.decorators import ratelimit

from django.contrib.sitemaps.views import sitemap as django_sitemap
from core.sitemaps import EventPageSitemap, NewsPageSitemap

from wagtail.admin import urls as wagtailadmin_urls
from wagtail import urls as wagtail_urls
from wagtail.documents import urls as wagtaildocs_urls

from search import views as search_views
import booking.urls as booking_urls
import events.urls as events_urls
from core.http_utils import htmx_error as _htmx_error, htmx_success as _htmx_success


@require_POST
@ratelimit(key='post:email', rate='10/h', method='POST', block=True)
def newsletter(request):
    """Newsletter signup — GDPR-compliant, stores consented email in DB."""
    email = request.POST.get("email", "").strip()
    if not email:
        return _htmx_error("Укажите email")

    from core.models import NewsletterSignup
    signup, created = NewsletterSignup.objects.get_or_create(
        email=email,
        defaults={"ip_address": request.META.get("REMOTE_ADDR")},
    )
    if not created:
        signup.is_active = True
        signup.save(update_fields=["is_active"])

    return _htmx_success("Подписка оформлена!")


def health_check(request):
    """Health check endpoint with DB connection verification."""
    try:
        connection.ensure_connection()
        return JsonResponse({"status": "ok"})
    except Exception as e:
        return JsonResponse({"status": "error", "detail": str(e)}, status=503)


def robots_txt(request):
    return HttpResponse(
        "User-agent: *\nAllow: /\n\nSitemap: https://dacha.maxdrobin.ru/sitemap.xml\n",
        content_type="text/plain",
    )


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("search/", search_views.search, name="search"),
    path("booking/", include(booking_urls)),
    path("events/", include(events_urls)),
    path("health/", health_check, name="health_check"),
    path("robots.txt", robots_txt, name="robots_txt"),
    path("sitemap.xml", django_sitemap, {"sitemaps": {"events": EventPageSitemap, "news": NewsPageSitemap}}, name="sitemap"),
    path("newsletter/", newsletter, name="newsletter"),
]


if settings.DEBUG:
    from django.conf.urls.static import static
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns

    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns = urlpatterns + [
    path("", include(wagtail_urls)),
]
