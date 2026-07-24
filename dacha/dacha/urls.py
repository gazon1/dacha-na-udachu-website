from django.conf import settings
from django.urls import include, path
from django.contrib import admin
from django.http import JsonResponse, HttpResponse
from django.db import connection

from wagtail.contrib.sitemaps.views import sitemap

from wagtail.admin import urls as wagtailadmin_urls
from wagtail import urls as wagtail_urls
from wagtail.documents import urls as wagtaildocs_urls

from search import views as search_views
import booking.urls as booking_urls
import events.urls as events_urls


def newsletter(request):
    """Simple newsletter signup - stores email in session for now."""
    email = request.POST.get("email")
    if email:
        request.session["newsletter_email"] = email
        return HttpResponse("Спасибо за подписку!")
    return HttpResponse("Укажите email", status=400)


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
    path("sitemap.xml", sitemap, name="sitemap"),
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
