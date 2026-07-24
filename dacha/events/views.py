import datetime
import json

from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404, render
from django.template.loader import render_to_string
from django.contrib.auth.decorators import login_required

from events.models import (
    EventPage, EventRSVP, EventDriver, RidePassenger,
    CarpoolRequest, TaxiPool, TaxiPassenger,
)
from events.forms import (
    RSVPForm, DriverForm, PassengerForm, CarpoolRequestForm,
    TaxiPoolForm, TaxiPassengerForm, htmx_error,
)


# ─── RSVP ────────────────────────────────────────────────────────────────────

@require_POST
def event_rsvp(request, slug):
    """Handle RSVP form submission via HTMX."""
    event = get_object_or_404(EventPage, slug=slug)

    form = RSVPForm(request.POST)
    if not form.is_valid():
        return htmx_error("Имя обязательно")

    rsvp, created = EventRSVP.objects.update_or_create(
        event=event,
        name=form.cleaned_data["name"],
        defaults={
            "status": form.cleaned_data["status"],
            "guests_count": form.cleaned_data["guests_count"],
        },
    )

    return HttpResponse(render_to_string("events/components/_rsvp_count.html", {
        "total": event.total_attending,
        "going": event.going_count,
        "maybe": event.maybe_count,
    }))


# ─── Ride-share ───────────────────────────────────────────────────────────────

def event_carpool_section(request, slug):
    """Return full carpool section HTML."""
    event = get_object_or_404(EventPage, slug=slug)
    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": event,
    }, request=request))


@require_POST
def event_add_driver(request, slug):
    """Add a new driver offer."""
    event = get_object_or_404(EventPage, slug=slug)

    form = DriverForm(request.POST)
    if not form.is_valid():
        return htmx_error("Заполните обязательные поля")

    driver = form.save(commit=False)
    driver.event = event
    driver.save()

    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": event,
        "success": f"Машина добавлена! https://dacha.maxdrobin.ru/events/{slug}/#driver-{driver.id}",
    }, request=request))


@require_POST
def event_join_ride(request, driver_id):
    """Join a driver's ride."""
    seats = int(request.POST.get("seats", 1) or 1)

    with transaction.atomic():
        driver = get_object_or_404(EventDriver.objects.select_for_update(), id=driver_id)

        if driver.is_cancelled:
            return htmx_error("Поездка отменена")

        if driver.seats_available < seats:
            return htmx_error("Недостаточно мест")

        form = PassengerForm(request.POST)
        if not form.is_valid():
            return htmx_error("Укажите имя")

        passenger = form.save(commit=False)
        passenger.driver = driver
        passenger.seats = seats
        passenger.status = RidePassenger.STATUS_CONFIRMED
        passenger.save()

    return HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))


@require_POST
def event_cancel_ride(request, driver_id):
    """Cancel driver's ride."""
    driver = get_object_or_404(EventDriver, id=driver_id)
    driver.is_cancelled = True
    driver.save(update_fields=["is_cancelled"])
    return HttpResponse(render_to_string("events/components/_driver_card.html", {
        "driver": driver,
    }, request=request))


@require_POST
def event_add_carpool_request(request, slug):
    """Add a ride request (looking for a ride)."""
    event = get_object_or_404(EventPage, slug=slug)

    form = CarpoolRequestForm(request.POST)
    if not form.is_valid():
        return htmx_error("Заполните обязательные поля")

    carpool = form.save(commit=False)
    carpool.event = event
    carpool.save()

    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": event,
    }, request=request))


@require_POST
def event_add_taxi_pool(request, slug):
    """Create a shared taxi pool."""
    event = get_object_or_404(EventPage, slug=slug)

    form = TaxiPoolForm(request.POST)
    if not form.is_valid():
        return htmx_error("Заполните обязательные поля")

    pool = form.save(commit=False)
    pool.event = event
    pool.save()

    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": event,
    }, request=request))


@require_POST
def event_join_taxi(request, pool_id):
    """Join a taxi pool."""
    seats = int(request.POST.get("seats", 1) or 1)

    with transaction.atomic():
        pool = get_object_or_404(TaxiPool.objects.select_for_update(), id=pool_id)

        if not pool.is_active or pool.spots_left <= 0:
            return htmx_error("Нет мест")

        if pool.spots_left < seats:
            return htmx_error("Недостаточно мест")

        form = TaxiPassengerForm(request.POST)
        if not form.is_valid():
            return htmx_error("Укажите имя")

        passenger = form.save(commit=False)
        passenger.taxi = pool
        passenger.seats = seats
        passenger.save()

    return HttpResponse(render_to_string("events/components/_drivers.html", {
        "page": pool.event,
    }, request=request))


# ─── iCal (.ics) ─────────────────────────────────────────────────────────────

def event_ical(request, slug):
    """Generate a minimal .ics calendar file for the event."""
    event = get_object_or_404(EventPage, slug=slug)

    start = datetime.datetime.combine(event.start_date, event.start_time or datetime.time(12, 0))
    end = datetime.datetime.combine(event.end_date or event.start_date, datetime.time(23, 59))

    uid = f"{slug}@dacha.local"
    summary = event.title
    location = event.venue or ""

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dacha//Event//RU",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
        f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
        f"SUMMARY:{summary}",
        f"LOCATION:{location}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    ics = "\r\n".join(lines)

    response = HttpResponse(ics, content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = f"attachment; filename={slug}.ics"
    return response
