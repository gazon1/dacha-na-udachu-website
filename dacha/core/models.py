from django.db import models
from wagtail.admin.panels import FieldPanel


class NewsletterSignup(models.Model):
    """Newsletter subscription — stores GDPR-consented email signup with IP for GDPR compliance."""
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
