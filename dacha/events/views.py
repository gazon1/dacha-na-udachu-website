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
    seats = int(request.POST.get("seats", 1) or 1)

    # Validate form BEFORE acquiring lock — avoid holding DB connection
    # while parsing/validating input
    form = PassengerForm(request.POST)
    if not form.is_valid():
        return htmx_error("Укажите имя")

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

    return HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))


@require_POST
@ratelimit(key='ip', rate='20/h', method='POST', block=True)
def event_cancel_ride(request, driver_id):
    """Cancel driver's ride."""
    driver = get_object_or_404(EventDriver, id=driver_id)
    driver.is_cancelled = True
    driver.save(update_fields=["is_cancelled"])
    return HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))


@require_POST
@ratelimit(key='ip', rate='20/h', method='POST', block=True)
def event_join_taxi(request, pool_id):
    """Join a taxi pool."""
    seats = int(request.POST.get("seats", 1) or 1)

    # Validate form BEFORE acquiring lock
    form = TaxiPassengerForm(request.POST)
    if not form.is_valid():
        return htmx_error("Укажите имя")

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

    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": pool.event,
    }, request=request))
