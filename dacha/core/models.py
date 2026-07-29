import uuid
from django.db import models
from wagtail.admin.panels import FieldPanel


class UserAccount(models.Model):
    """Lightweight account for RSVP identity — no password, auth via token."""
    name = models.CharField("Имя", max_length=100)
    phone = models.CharField("Телефон", max_length=20)
    token = models.UUIDField("Токен", default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField("Создан", auto_now_add=True)

    panels = [
        FieldPanel("name"),
        FieldPanel("phone"),
    ]

    class Meta:
        verbose_name = "Аккаунт"
        verbose_name_plural = "Аккаунты"
        constraints = [
            models.UniqueConstraint(fields=["name", "phone"], name="unique_name_phone"),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone})"


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
