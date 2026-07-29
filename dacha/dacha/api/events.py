"""
Events API — RSVP, carpool, taxi, attendees, ical.
"""
import base64
import json
from datetime import datetime

from django.db import transaction
from django.db.models import Value
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from ninja import Router
from ninja.pagination import paginate

from events.forms import (
    RSVPForm,
    DriverForm,
    CarpoolRequestForm,
    TaxiPoolForm,
    PassengerForm,
    TaxiPassengerForm,
)
from events.models import (
    EventPage,
    EventRSVP,
    EventDriver,
    RidePassenger,
    CarpoolRequest,
    TaxiPool,
    TaxiPassenger,
)

from .schemas import (
    AttendeeOut,
    CarpoolRequestIn,
    CarpoolRequestOut,
    CarpoolSectionOut,
    DriverIn,
    DriverOut,
    EventOut,
    PassengerIn,
    PassengerOut,
    RSVPClaimIn,
    RSVPMEOut,
    RSVPSubmitIn,
    RSVPOut,
    TaxiPassengerIn,
    TaxiPoolIn,
    TaxiPoolOut,
    TaxiPassengerOut,
)

router = Router(tags=["events"])


# ─── RSVP helpers ──────────────────────────────────────────────────────────────

def _parse_rsvp_cookie(request: HttpRequest, event_id: int) -> tuple[str | None, int | None]:
    """Read rsvp_<event_id> cookie. Returns (secret_key, rsvp_id) or (None, None)."""
    cookie_name = f"rsvp_{event_id}"
    raw = request.COOKIES.get(cookie_name, "")
    if not raw:
        return None, None
    try:
        decoded = base64.b64decode(raw).decode()
        secret_key, rsvp_id = decoded.rsplit(":", 1)
        return secret_key, int(rsvp_id)
    except Exception:
        return None, None


def _set_rsvp_cookie(response: HttpResponse, event_id: int, secret_key: str, rsvp_id: int):
    value = base64.b64encode(f"{secret_key}:{rsvp_id}".encode()).decode()
    response.set_cookie(
        key=f"rsvp_{event_id}",
        value=value,
        httponly=True,
        samesite="Lax",
        secure=True,
        max_age=31536000,
        path="/",
    )


def _clear_rsvp_cookie(response: HttpResponse, event_id: int):
    response.delete_cookie(key=f"rsvp_{event_id}", path="/")


def _rsvp_to_out(rsvp: EventRSVP) -> RSVPOut:
    return RSVPOut(
        id=rsvp.id,
        name=rsvp.name,
        status=rsvp.status,
        guests_count=rsvp.guests_count,
    )


def _driver_to_out(d: EventDriver) -> DriverOut:
    return DriverOut(
        id=d.id,
        name=d.name,
        telegram=d.telegram or None,
        phone=d.phone or None,
        car_model=d.car_model or "",
        car_type=d.car_type or "",
        seats_total=d.seats_total,
        seats_taken=d._seats_taken,
        seats_available=d.seats_available,
        departure_date=d.departure_date,
        departure_time=str(d.departure_time) if d.departure_time else None,
        departure_location=d.departure_location or "",
        return_date=d.return_date,
        return_time=str(d.return_time) if d.return_time else None,
        notes=d.notes or "",
        contact_preference=d.contact_preference,
        is_cancelled=d.is_cancelled,
        is_verified=d.is_verified,
        cancel_token=d.cancel_token or "",
        created_at=d.created_at,
    )


def _request_to_out(r: CarpoolRequest) -> CarpoolRequestOut:
    return CarpoolRequestOut(
        id=r.id,
        name=r.name,
        telegram=r.telegram or None,
        phone=r.phone or None,
        pickup_location=r.pickup_location or "",
        seats_needed=r.seats_needed,
        can_share_gas=r.can_share_gas,
        flexible_time=r.flexible_time,
        notes=r.notes or "",
        is_active=r.is_active,
        created_at=r.created_at,
    )


def _taxi_to_out(t: TaxiPool) -> TaxiPoolOut:
    return TaxiPoolOut(
        id=t.id,
        organizer=t.organizer,
        telegram=t.telegram or None,
        pickup_location=t.pickup_location or "",
        departure_date=t.departure_date,
        departure_time=str(t.departure_time) if t.departure_time else "",
        max_passengers=t.max_passengers,
        passengers_count=t._passengers_count,
        spots_left=t.spots_left,
        estimated_price=t.estimated_price,
        service=t.service,
        notes=t.notes or "",
        is_active=t.is_active,
        created_at=t.created_at,
    )


# ─── Event helpers ────────────────────────────────────────────────────────────

def _event_to_out(e: EventPage) -> EventOut:
    """Unified EventPage → EventOut mapper."""
    return EventOut(
        id=e.id,
        title=e.title,
        slug=e.slug,
        start_date=e.start_date,
        end_date=e.end_date,
        start_time=str(e.start_time) if e.start_time else None,
        venue=e.venue or "",
        venue_notes=e.venue_notes or "",
        map_link=e.map_link or "",
        summary=e.summary or "",
        show_countdown=e.show_countdown,
        expected_temperature=e.expected_temperature or "",
        weather_note=e.weather_note or "",
        special_tag=e.special_tag or "",
        rsvp_capacity=e.rsvp_capacity,
        going_count=e.going_count or 0,
        maybe_count=e.maybe_count or 0,
        total_attending=e.total_attending_db or 0,
        url=e.url,
    )


# ─── Event listing ─────────────────────────────────────────────────────────────

@router.get("/", response=list[EventOut])
def list_events(request, upcoming: bool = True):
    """List upcoming or past events with stats."""
    now = timezone.now().date()
    qs = EventPage.objects.with_stats().live().public()
    if upcoming:
        qs = qs.filter(start_date__gte=now).order_by("start_date")
    else:
        qs = qs.filter(start_date__lt=now).order_by("-start_date")
    return [_event_to_out(e) for e in qs]


@router.get("/{event_id}/", response=EventOut)
def get_event(event_id: int):
    """Get a single event with aggregate stats."""
    e = EventPage.objects.with_stats().get(pk=event_id)
    return _event_to_out(e)


# ─── RSVP ─────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/rsvp/me", response=RSVPMEOut)
def rsvp_me(request, event_id: int):
    """Read current user's RSVP from cookie."""
    secret_key, rsvp_id = _parse_rsvp_cookie(request, event_id)
    if not secret_key or not rsvp_id:
        return RSVPMEOut(voted=False)

    try:
        rsvp = EventRSVP.objects.get(id=rsvp_id, event_id=event_id)
        if str(rsvp.secret_key) == secret_key:
            return RSVPMEOut(
                voted=True,
                id=rsvp.id,
                name=rsvp.name,
                status=rsvp.status,
                secret_key=rsvp.secret_key,
            )
    except EventRSVP.DoesNotExist:
        pass
    return RSVPMEOut(voted=False)


@router.post("/{event_id}/rsvp/")
def submit_rsvp(request, event_id: int, data: RSVPSubmitIn):
    """Create or update an RSVP, set httpOnly cookie, return JSON."""
    event = EventPage.objects.get(pk=event_id)
    response_data: dict = {}

    form_data = {
        "name": data.name,
        "status": data.status,
        "guests_count": str(data.guests_count),
    }
    form = RSVPForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации", "details": dict(form.errors)}, 400

    with transaction.atomic():
        existing = EventRSVP.objects.filter(
            event=event, name=data.name
        ).first()

        if existing:
            if data.secret_key and data.secret_key != str(existing.secret_key):
                return {"error": "Неверный ключ"}, 403
            old_status = existing.status
            existing.status = data.status
            existing.guests_count = data.guests_count
            existing.save(update_fields=["status", "guests_count"])
            rsvp = existing
            created = False
        else:
            effective_status = data.status
            if (
                event.rsvp_capacity
                and data.status in ("going", "maybe")
            ):
                confirmed = event.rsvps.filter(
                    status__in=["going", "maybe"]
                ).count()
                if confirmed >= event.rsvp_capacity:
                    effective_status = EventRSVP.WAITING

            rsvp = EventRSVP.objects.create(
                event=event,
                name=data.name,
                status=effective_status,
                guests_count=data.guests_count,
            )
            created = True

            # Promote waiting if going/maybe left
            if effective_status != EventRSVP.WAITING:
                pass  # Already going/maybe, no need to promote
            else:
                # A spot may have opened — try to promote
                if old_status in ("going", "maybe") if existing else False:
                    event.promote_first_waiting()

    # Set cookie
    response = HttpResponse()
    _set_rsvp_cookie(response, event_id, str(rsvp.secret_key), rsvp.id)
    response["Content-Type"] = "application/json"
    response.write(json.dumps({
        "id": rsvp.id,
        "name": rsvp.name,
        "status": rsvp.status,
        "created": created,
    }))
    return response


@router.post("/{event_id}/rsvp/cancel/")
def cancel_rsvp(request, event_id: int):
    """Cancel/delete an RSVP using cookie credentials."""
    secret_key = request.COOKIES.get(f"rsvp_{event_id}", "")
    if not secret_key:
        return {"error": "Не авторизован"}, 401

    try:
        decoded = base64.b64decode(secret_key).decode()
        key, rsvp_id = decoded.rsplit(":", 1)
        rsvp_id = int(rsvp_id)
    except Exception:
        return {"error": "Неверный формат cookie"}, 400

    with transaction.atomic():
        try:
            rsvp = EventRSVP.objects.get(id=rsvp_id, event_id=event_id)
        except EventRSVP.DoesNotExist:
            return {"error": "RSVP не найден"}, 404

        if str(rsvp.secret_key) != key:
            return {"error": "Неверный ключ"}, 403

        was_confirmed = rsvp.status in ("going", "maybe")
        rsvp.delete()

        if was_confirmed:
            EventPage.objects.filter(pk=event_id).first().promote_first_waiting()

    response = HttpResponse(status=204)
    _clear_rsvp_cookie(response, event_id)
    return response


@router.post("/{event_id}/rsvp/claim/")
def claim_rsvp(request, event_id: int, data: RSVPClaimIn):
    """Migrate legacy localStorage RSVP key to httpOnly cookie."""
    try:
        rsvp = EventRSVP.objects.get(
            event_id=event_id,
            secret_key=data.secret_key,
        )
    except EventRSVP.DoesNotExist:
        return {"error": "RSVP не найден"}, 404

    response = HttpResponse()
    _set_rsvp_cookie(response, event_id, str(rsvp.secret_key), rsvp.id)
    response["Content-Type"] = "application/json"
    response.write(json.dumps({
        "id": rsvp.id,
        "name": rsvp.name,
        "status": rsvp.status,
    }))
    return response


@router.get("/{event_id}/attendees/", response=list[AttendeeOut])
@paginate
def list_attendees(request, event_id: int):
    """Paginated list of going/maybe attendees."""
    return (
        EventRSVP.objects
        .filter(event_id=event_id, status__in=["going", "maybe"])
        .order_by("-created_at")
    )


# ─── Carpool section ───────────────────────────────────────────────────────────

@router.get("/{event_id}/carpool/", response=CarpoolSectionOut)
def get_carpool_section(request, event_id: int):
    """Return all carpool data for an event."""
    drivers = list(EventDriver.objects.with_carpool_stats().filter(event_id=event_id))
    requests = list(CarpoolRequest.objects.filter(event_id=event_id, is_active=True))
    pools = list(TaxiPool.objects.with_taxi_stats().filter(event_id=event_id, is_active=True))
    return CarpoolSectionOut(
        drivers=[_driver_to_out(d) for d in drivers],
        carpool_requests=[_request_to_out(r) for r in requests],
        taxi_pools=[_taxi_to_out(t) for t in pools],
    )


# ─── Carpool mutations ────────────────────────────────────────────────────────

@router.post("/{event_id}/carpool/drivers/")
def add_driver(request, event_id: int, data: DriverIn):
    """Add a driver offer."""
    form_data = {
        "name": data.name,
        "phone": data.phone,
        "telegram": data.telegram or "",
        "car_model": data.car_model,
        "car_type": data.car_type,
        "seats_total": str(data.seats_total),
        "departure_date": str(data.departure_date) if data.departure_date else "",
        "departure_time": data.departure_time or "",
        "departure_location": data.departure_location,
        "return_date": str(data.return_date) if data.return_date else "",
        "return_time": data.return_time or "",
        "notes": data.notes,
        "contact_preference": data.contact_preference,
    }
    form = DriverForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации", "details": dict(form.errors)}, 400

    driver = form.save(commit=False)
    driver.event_id = event_id
    driver.save()
    return _driver_to_out(driver)


@router.post("/{event_id}/carpool/requests/")
def add_carpool_request(request, event_id: int, data: CarpoolRequestIn):
    """Add a ride request (looking for a ride)."""
    form_data = {
        "name": data.name,
        "phone": data.phone,
        "telegram": data.telegram or "",
        "pickup_location": data.pickup_location,
        "seats_needed": str(data.seats_needed),
        "can_share_gas": data.can_share_gas,
        "flexible_time": data.flexible_time,
        "notes": data.notes,
    }
    form = CarpoolRequestForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации", "details": dict(form.errors)}, 400

    carpool = form.save(commit=False)
    carpool.event_id = event_id
    carpool.save()
    return _request_to_out(carpool)


@router.post("/{event_id}/carpool/taxi-pools/")
def add_taxi_pool(request, event_id: int, data: TaxiPoolIn):
    """Create a shared taxi pool."""
    form_data = {
        "organizer": data.organizer,
        "telegram": data.telegram or "",
        "pickup_location": data.pickup_location,
        "departure_date": str(data.departure_date),
        "departure_time": data.departure_time,
        "max_passengers": str(data.max_passengers),
        "estimated_price": str(data.estimated_price),
        "service": data.service,
        "notes": data.notes,
    }
    form = TaxiPoolForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации", "details": dict(form.errors)}, 400

    pool = form.save(commit=False)
    pool.event_id = event_id
    pool.save()
    return _taxi_to_out(pool)


# ─── Join / cancel ride ────────────────────────────────────────────────────────

@router.post("/{event_id}/drivers/{driver_id}/join")
def join_ride(request, event_id: int, driver_id: int, data: PassengerIn):
    """Join a driver's ride."""
    form_data = {
        "name": data.name,
        "phone": data.phone,
        "telegram": data.telegram or "",
        "pickup_location": data.pickup_location,
        "seats": str(data.seats),
        "notes": data.notes,
    }
    form = PassengerForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации"}, 400

    with transaction.atomic():
        driver = EventDriver.objects.select_for_update().get(pk=driver_id)
        if driver.is_cancelled:
            return {"error": "Поездка отменена"}, 409

        if driver.seats_available < data.seats:
            return {"error": "Недостаточно мест"}, 409

        passenger = form.save(commit=False)
        passenger.driver = driver
        passenger.status = RidePassenger.STATUS_CONFIRMED
        passenger.save()

    return PassengerOut(
        id=passenger.id,
        name=passenger.name,
        telegram=passenger.telegram or None,
        phone=passenger.phone or None,
        pickup_location=passenger.pickup_location or "",
        seats=passenger.seats,
        notes=passenger.notes or "",
        status=passenger.status,
        created_at=passenger.created_at,
    )


@router.post("/{event_id}/drivers/{driver_id}/cancel")
def cancel_driver(request, event_id: int, driver_id: int, token: str = ""):
    """Cancel a driver's ride using cancel_token."""
    driver = EventDriver.objects.get(pk=driver_id)
    if driver.cancel_token and token != driver.cancel_token:
        return {"error": "Неверный токен"}, 403

    driver.is_cancelled = True
    driver.save(update_fields=["is_cancelled"])
    return _driver_to_out(driver)


@router.post("/{event_id}/taxi-pools/{pool_id}/join")
def join_taxi(request, event_id: int, pool_id: int, data: TaxiPassengerIn):
    """Join a taxi pool."""
    form_data = {
        "name": data.name,
        "phone": data.phone,
        "telegram": data.telegram or "",
        "seats": str(data.seats),
        "notes": data.notes,
    }
    form = TaxiPassengerForm(data=form_data)
    if not form.is_valid():
        return {"error": "Ошибка валидации"}, 400

    with transaction.atomic():
        pool = TaxiPool.objects.select_for_update().with_taxi_stats().get(pk=pool_id)
        if not pool.is_active:
            return {"error": "Такси-пул неактивен"}, 409
        if pool.spots_left <= 0:
            return {"error": "Нет мест"}, 409
        if pool.spots_left < data.seats:
            return {"error": "Недостаточно мест"}, 409

        passenger = form.save(commit=False)
        passenger.taxi = pool
        passenger.save()

    return TaxiPassengerOut(
        id=passenger.id,
        name=passenger.name,
        telegram=passenger.telegram or None,
        phone=passenger.phone or None,
        seats=passenger.seats,
        notes=passenger.notes or "",
        is_active=passenger.is_active,
        created_at=passenger.created_at,
    )


# ─── .ics download ─────────────────────────────────────────────────────────────

@router.get("/{event_id}/ical/")
def event_ical(request, event_id: int):
    """Generate .ics calendar file for an event."""
    event = EventPage.objects.only(
        "start_date", "end_date", "start_time", "slug", "title", "venue",
    ).get(pk=event_id)
    start = datetime.combine(event.start_date, event.start_time or datetime.min.time())
    end = datetime.combine(
        event.end_date or event.start_date,
        datetime.max.time(),
    )
    uid = f"{event.slug}@dacha.local"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dacha//Event//RU",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
        f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
        f"SUMMARY:{event.title}",
        f"LOCATION:{event.venue or ''}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    response = HttpResponse("\r\n".join(lines), content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = f"attachment; filename={event.slug}.ics"
    return response
