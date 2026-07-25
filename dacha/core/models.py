from django.db import models
from django.contrib.auth.models import AbstractUser
from wagtail.admin.panels import FieldPanel
from wagtail.contrib.settings.models import BaseSiteSetting


class User(AbstractUser):
    """Custom user model — allows adding phone, avatar, telegram fields later."""
    phone = models.CharField("Телефон", max_length=20, blank=True)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    avatar = models.ImageField("Аватар", upload_to="avatars/", blank=True, null=True)

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"


class SiteSettings(BaseSiteSetting):
    brand_name = models.CharField(max_length=255, default="Dacha")
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    telegram_url = models.URLField(blank=True)

    # Extra prices for booking add-ons (bank/vanna, mangal, etc.)
    # Stored as JSON dict: {"banya": 500, "manhal": 300, "fishing": 200}
    extra_prices = models.JSONField(
        default=dict,
        blank=True,
        help_text="Цены на доп. услуги в формате JSON, например: {\"banya\": 500, \"manhal\": 300}",
    )

    panels = [
        FieldPanel("brand_name"),
        FieldPanel("phone"),
        FieldPanel("email"),
        FieldPanel("address"),
        FieldPanel("telegram_url"),
        FieldPanel("extra_prices"),
    ]

    def get_extra_prices(self):
        """Return dict of extra prices from ExtraService model, falling back to legacy JSONField."""
        try:
            from collections import OrderedDict
            services = OrderedDict()
            for s in ExtraService.objects.filter(is_active=True).order_by("order"):
                services[s.slug] = s.price
            if services:
                return services
        except Exception:
            pass
        # Legacy fallback from JSONField
        defaults = {"banya": 500, "manhal": 300, "fishing": 200}
        if self.extra_prices:
            defaults.update(self.extra_prices)
        return defaults

    def __str__(self):
        return self.brand_name

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"


class NewsletterSignup(models.Model):
    """Newsletter subscription — stores GDPR-consented email signups."""
    email = models.EmailField("Email", unique=True)
    subscribed_at = models.DateTimeField("Дата подписки", auto_now_add=True)
    is_active = models.BooleanField("Активна", default=True)
    ip_address = models.GenericIPAddressField("IP", null=True, blank=True)

    panels = [
        FieldPanel("email"),
        FieldPanel("is_active"),
    ]

    class Meta:
        verbose_name = "Подписка на рассылку"
        verbose_name_plural = "Подписки на рассылку"
        ordering = ["-subscribed_at"]

    def __str__(self):
        return self.email


class ExtraService(models.Model):
    """Represents an optional add-on service for bookings (e.g. banya, manhal)."""
    slug = models.SlugField("Идентификатор", unique=True, max_length=50)
    name = models.CharField("Название", max_length=100)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2)
    is_active = models.BooleanField("Активна", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    panels = [
        FieldPanel("slug"),
        FieldPanel("name"),
        FieldPanel("price"),
        FieldPanel("is_active"),
        FieldPanel("order"),
    ]

    class Meta:
        verbose_name = "Доп. услуга"
        verbose_name_plural = "Доп. услуги"
        ordering = ["order", "name"]

    def __str__(self):
        return f"{self.name} — {self.price} ₽"
