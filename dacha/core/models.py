from django.db import models
from wagtail.admin.panels import FieldPanel
from wagtail.contrib.settings.models import BaseSiteSetting


class SiteSettings(BaseSiteSetting):
    brand_name = models.CharField(max_length=255, default="Dacha")
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    telegram_url = models.URLField(blank=True)

    panels = [
        FieldPanel("brand_name"),
        FieldPanel("phone"),
        FieldPanel("email"),
        FieldPanel("address"),
        FieldPanel("telegram_url"),
    ]

    def __str__(self):
        return self.brand_name

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"
