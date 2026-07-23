from django.db import models


class Booking(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата заявки")
    check_in = models.DateField(verbose_name="Дата заезда")
    check_out = models.DateField(verbose_name="Дата выезда")
    name = models.CharField(max_length=255, verbose_name="Имя")
    phone = models.CharField(max_length=50, verbose_name="Телефон")
    telegram = models.CharField(max_length=255, verbose_name="Telegram", blank=True)
    guest_num = models.IntegerField(verbose_name="Количество гостей", default=1)
    
    # Дополнительные поля для статуса
    is_confirmed = models.BooleanField(default=False, verbose_name="Подтверждено")

    class Meta:
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.check_in} - {self.check_out})"