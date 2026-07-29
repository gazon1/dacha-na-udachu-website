"""
Event signals — sends admin email notifications on new drivers and RSVPs.
Emails are dispatched via transaction.on_commit to avoid sending if the
surrounding transaction rolls back.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import mail_managers
from .models import EventDriver, EventRSVP


def _notify_managers(subject: str, message: str) -> None:
    """Send email to managers synchronously (called inside on_commit)."""
    mail_managers(subject=subject, message=message)


@receiver(post_save, sender=EventDriver)
def notify_admin_on_driver(sender, instance, created, **kwargs):
    """Email managers when a new driver offer is added (after commit only)."""
    if created:
        from django.db import transaction
        transaction.on_commit(
            lambda: _notify_managers(
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
        )


@receiver(post_save, sender=EventRSVP)
def notify_admin_on_rsvp(sender, instance, created, **kwargs):
    """Email managers when a new RSVP is submitted (after commit only)."""
    if created:
        from django.db import transaction
        transaction.on_commit(
            lambda: _notify_managers(
                subject=f"[dacha] Новый RSVP: {instance.name} — {instance.event.title}",
                message=(
                    f"Событие: {instance.event.title}\n"
                    f"Имя: {instance.name}\n"
                    f"Статус: {instance.get_status_display()}\n"
                    f"Гостей: {instance.guests_count}\n"
                ),
            )
        )
