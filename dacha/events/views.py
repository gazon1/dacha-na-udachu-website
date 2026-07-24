import datetime
import uuid
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from events.models import EventPage, EventRSVP, EventDriver


# ─── RSVP ────────────────────────────────────────────────────────────────────

@require_POST
def event_rsvp(request, slug):
    """Handle RSVP form submission via HTMX."""
    event = get_object_or_404(EventPage, slug=slug)

    name = request.POST.get("name", "").strip()[:100]
    status = request.POST.get("status", EventRSVP.GOING)
    guests = int(request.POST.get("guests", 0) or 0)

    if not name:
        return HttpResponse("Имя обязательно", status=400)

    if status not in dict(EventRSVP.STATUS_CHOICES):
        status = EventRSVP.GOING

    rsvp, created = EventRSVP.objects.update_or_create(
        event=event,
        name=name,
        defaults={"status": status, "guests_count": guests},
    )

    # Re-count from DB
    total = event.total_attending
    going = event.going_count
    maybe = event.maybe_count

    return render_to_string("events/components/_rsvp_count.html", {
        "total": total,
        "going": going,
        "maybe": maybe,
    })


# ─── Ride-share ───────────────────────────────────────────────────────────────

@require_POST
def event_join_ride(request, driver_id):
    """Join a driver's ride (+1 seat taken)."""
    driver = get_object_or_404(EventDriver, id=driver_id)
    if driver.seats_taken >= driver.seats_total:
        return HttpResponse("Мест нет", status=400)

    driver.seats_taken = min(driver.seats_taken + 1, driver.seats_total)
    driver.save(update_fields=["seats_taken"])

    return render_to_string("events/components/_drivers.html", {
        "page": driver.event,
        "drivers": driver.event.drivers.all(),
    })


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
