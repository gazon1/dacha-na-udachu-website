from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Booking(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата заявки")
    house = models.ForeignKey(
        "houses.HousePage",
        on_delete=models.CASCADE,
        related_name="bookings",
        null=True,
        blank=True,
    )
    check_in = models.DateField(verbose_name="Дата заезда")
    check_out = models.DateField(verbose_name="Дата выезда")
    name = models.CharField(max_length=255, verbose_name="Имя")
    phone = models.CharField(max_length=50, verbose_name="Телефон")
    telegram = models.CharField(max_length=255, verbose_name="Telegram", blank=True)
    guest_num = models.IntegerField(verbose_name="Количество гостей", default=1)
    is_confirmed = models.BooleanField(default=False, verbose_name="Подтверждено")

    # ─── Price snapshot (saved at booking time — do not recompute later) ───
    options = models.JSONField(
        default=dict,
        blank=True,
        help_text="Выбранные доп. услуги в момент бронирования",
    )
    base_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Цена за ночь на момент бронирования",
    )
    extras_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Стоимость доп. услуг на момент бронирования",
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Итоговая цена на момент бронирования",
    )

    class Meta:
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"
        ordering = ["-created_at"]

    def overlaps(self):
        """Check for overlapping confirmed bookings for the same house."""
        if not self.house or not self.check_in or not self.check_out:
            return False
        return Booking.objects.filter(
            house=self.house,
            is_confirmed=True,
            check_in__lt=self.check_out,
            check_out__gt=self.check_in,
        ).exclude(pk=self.pk).exists()

    def __str__(self):
        return f"{self.name} ({self.check_in} - {self.check_out})"
