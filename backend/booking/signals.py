"""
Booking signals — sends admin email notifications on new/confirmed bookings.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import mail_managers
from .models import Booking


@receiver(post_save, sender=Booking)
def notify_admin_on_booking(sender, instance, created, **kwargs):
    """Email managers when a new booking is created."""
    if created:
        status = "НОВАЯ ЗАЯВКА" if not instance.is_confirmed else "ПОДТВЕРЖДЁННОЕ БРОНИРОВАНИЕ"
        house = instance.house.title if instance.house else "Неизвестный дом"
        mail_managers(
            subject=f"[dacha] {status}: {instance.name} — {instance.check_in}–{instance.check_out}",
            message=(
                f"Имя: {instance.name}\n"
                f"Телефон: {instance.phone}\n"
                f"Telegram: {instance.telegram or '—'}\n"
                f"Дом: {house}\n"
                f"Заезд: {instance.check_in}\n"
                f"Выезд: {instance.check_out}\n"
                f"Гостей: {instance.guest_num}\n"
                f"Сумма: {instance.total_price} ₽\n"
                f"Подтверждено: {'Да' if instance.is_confirmed else 'Нет'}\n"
            ),
        )
