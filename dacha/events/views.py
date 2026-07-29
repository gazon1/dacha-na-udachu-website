from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.contrib import messages
from django_ratelimit.decorators import ratelimit

from events.models import (
    EventDriver, RidePassenger,
    TaxiPool,
)
from events.forms import PassengerForm, TaxiPassengerForm
from events.http_utils import htmx_error


# ─── ID-based handlers (slug not needed, stay here) ───────────────────────────

@require_POST
@ratelimit(key='ip', rate='20/h', method='POST', block=True)
def event_join_ride(request, driver_id):
    """Join a driver's ride."""
    form = PassengerForm(request.POST)
    if not form.is_valid():
        return htmx_error("Укажите имя")

    seats = form.cleaned_data["seats"]

    with transaction.atomic():
        driver = get_object_or_404(EventDriver.objects.select_for_update(), id=driver_id)

        if driver.is_cancelled:
            return htmx_error("Поездка отменена")

        if driver.seats_available < seats:
            return htmx_error("Недостаточно мест")

        passenger = form.save(commit=False)
        passenger.driver = driver
        passenger.seats = seats
        passenger.status = RidePassenger.STATUS_CONFIRMED
        passenger.save()

    response = HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))
    response["HX-Trigger"] = "seats-updated"
    return response


@require_POST
@ratelimit(key='ip', rate='20/h', method='POST', block=True)
def event_cancel_ride(request, driver_id):
    """Cancel driver's ride. Requires the driver's cancel_token in POST."""
    driver = get_object_or_404(EventDriver, id=driver_id)
    # Blank token = legacy driver created before migration; allow cancel without token.
    # New drivers always have a non-blank token set on save().
    if driver.cancel_token and request.POST.get("token", "") != driver.cancel_token:
        return htmx_error("Неверный токен отмены", status=403)
    driver.is_cancelled = True
    driver.save(update_fields=["is_cancelled"])
    response = HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))
    response["HX-Trigger"] = "seats-updated"
    return response


@require_POST
@ratelimit(key='ip', rate='20/h', method='POST', block=True)
def event_join_taxi(request, pool_id):
    """Join a taxi pool."""
    form = TaxiPassengerForm(request.POST)
    if not form.is_valid():
        return htmx_error("Укажите имя")

    seats = form.cleaned_data["seats"]

    with transaction.atomic():
        pool = get_object_or_404(TaxiPool.objects.select_for_update(), id=pool_id)

        if not pool.is_active or pool.spots_left <= 0:
            return htmx_error("Нет мест")

        if pool.spots_left < seats:
            return htmx_error("Недостаточно мест")

        passenger = form.save(commit=False)
        passenger.taxi = pool
        passenger.seats = seats
        passenger.save()

    response = HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": pool.event,
    }, request=request))
    response["HX-Trigger"] = "seats-updated"
    return response
