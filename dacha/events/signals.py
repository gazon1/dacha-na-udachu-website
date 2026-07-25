"""
Event signals — sends admin email notifications on new drivers and RSVPs.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import mail_managers
from .models import EventDriver, EventRSVP, TaxiPassenger


@receiver(post_save, sender=EventDriver)
def notify_admin_on_driver(sender, instance, created, **kwargs):
    """Email managers when a new driver offer is added."""
    if created:
        mail_managers(
            subject=f"[dacha] Новый водитель: {instance.name} → {instance.event.title}",
            message=(
                f"Событие: {instance.event.title}\n"
                f"Водитель: {instance.name}\n"
                f"Машина: {instance.car_model}\n"
                f"Откуда: {instance.departure_location}\n"
                f"Свободных мест: {instance.seats_available}\n"
                f"Telegram: {instance.telegram or '—'}\n"
            ),
        )


@receiver(post_save, sender=EventRSVP)
def notify_admin_on_rsvp(sender, instance, created, **kwargs):
    """Email managers when a new RSVP is submitted."""
    if created:
        mail_managers(
            subject=f"[dacha] Новый RSVP: {instance.name} — {instance.event.title}",
            message=(
                f"Событие: {instance.event.title}\n"
                f"Имя: {instance.name}\n"
                f"Статус: {instance.get_status_display()}\n"
                f"Гостей: {instance.guests_count}\n"
            ),
        )
