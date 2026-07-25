"""
Sitemap definitions for Wagtail pages.
Provides separate sitemaps for EventPage and NewsPage
so they can be submitted to search engines independently.
"""
from wagtail.contrib.sitemaps.sitemaps import WagtailSitemap
from events.models import EventPage
from news.models import NewsPage


class EventPageSitemap(WagtailSitemap):
    def items(self):
        return EventPage.objects.live().public()

    def lastmod(self, obj):
        return getattr(obj, "latest_revision_created_at", None)


class NewsPageSitemap(WagtailSitemap):
    def items(self):
        return NewsPage.objects.live().public()

    def lastmod(self, obj):
        return getattr(obj, "latest_revision_created_at", None)


sitemap = {
    "event_pages": EventPageSitemap,
    "news_pages": NewsPageSitemap,
}
