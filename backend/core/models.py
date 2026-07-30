import uuid

from django.db import models
from django.utils import timezone
from wagtail.admin.panels import FieldPanel


class UserAccount(models.Model):
    """
    User account — identified by Telegram only (no passwords).

    Created and updated via Telegram Login Widget HMAC-verified callback.
    Session token is stored in httpOnly cookie.
    """

    # ── Telegram identity (NOT NULL) ───────────────────────────────────────────
    telegram_id = models.BigIntegerField(
        "Telegram ID",
        unique=True,
        db_index=True,
    )

    # ── Telegram profile data ──────────────────────────────────────────────────
    telegram_username = models.CharField(
        "Telegram username",
        max_length=64,
        blank=True,
        default="",
    )
    telegram_first_name = models.CharField("Имя (Telegram)", max_length=200)
    telegram_last_name = models.CharField(
        "Фамилия (Telegram)",
        max_length=200,
        blank=True,
        default="",
    )
    telegram_photo_url = models.URLField(
        "Фото (Telegram)",
        blank=True,
        default="",
    )

    # ── Auth state ─────────────────────────────────────────────────────────────
    auth_date = models.DateTimeField(
        "Время авторизации в Telegram",
        default=timezone.now,
    )
    session_token = models.UUIDField(
        "Сессия",
        default=uuid.uuid4,
        unique=True,
        db_index=True,
    )

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    last_seen_at = models.DateTimeField("Последний визит", auto_now=True)

    panels = [
        FieldPanel("telegram_id"),
        FieldPanel("telegram_first_name"),
        FieldPanel("telegram_username"),
    ]

    class Meta:
        verbose_name = "Аккаунт"
        verbose_name_plural = "Аккаунты"

    def __str__(self) -> str:
        name = self.telegram_first_name
        if self.telegram_username:
            name += f" (@{self.telegram_username})"
        return name


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
