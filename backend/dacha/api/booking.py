"""
Booking API endpoints — GET houses/availability/quote, POST submit.
"""
from datetime import date

from django.db import transaction
from django.http import JsonResponse
from ninja import Router

from booking.forms import BookingForm
from booking.models import Booking
from booking.services import (
    BookingServiceError,
    calculate_total,
    get_booking_summary,
    get_extra_prices_from_site,
    calculate_nights,
)
from booking.availability import is_available, get_booked_dates
from houses.models import HousePage

from .schemas import (
    AvailabilityOut,
    BookingQuoteIn,
    BookingQuoteOut,
    BookingSubmitIn,
    BookingSubmitOut,
    HouseOut,
)

router = Router(tags=["booking"])


@router.get("/houses/", response=list[HouseOut])
def list_houses(request):
    """List all houses that have booking enabled."""
    houses = HousePage.objects.live().public().filter(booking_enabled=True)
    return [
        HouseOut(
            id=h.id,
            title=h.title,
            summary=h.summary or "",
            capacity=h.capacity or 1,
            bedrooms=h.bedrooms or 1,
            address=h.address or "",
            base_price=float(h.base_price or 0),
            booking_enabled=h.booking_enabled,
            hero_image_url=h.hero_image.file.url if h.hero_image else None,
        )
        for h in houses
    ]


@router.get("/availability/", response=AvailabilityOut)
def check_availability(request, house: int, check_in: str = "", check_out: str = ""):
    """Return booked dates and availability for a house."""
    booked = get_booked_dates(house) if house else []
    available = True
    if check_in and check_out:
        try:
            ci = date.fromisoformat(check_in)
            co = date.fromisoformat(check_out)
            if house:
                available = is_available(house, ci, co)
        except ValueError:
            pass
    return AvailabilityOut(available=available, booked_dates=booked)


@router.get("/quote/", response=BookingQuoteOut)
def get_quote(request, house: int, check_in: str, check_out: str,
              banya: bool = False, manhal: bool = False, fishing: bool = False):
    """Server-side price calculation — the single source of truth."""
    try:
        ci = date.fromisoformat(check_in)
        co = date.fromisoformat(check_out)
    except ValueError:
        return BookingQuoteOut(
            nights=0, price_per_night=0, extras={},
            extras_total=0, subtotal=0, total=0,
        )

    h = HousePage.objects.filter(pk=house).first()
    if not h:
        return BookingQuoteOut(
            nights=0, price_per_night=0, extras={},
            extras_total=0, subtotal=0, total=0,
        )

    options = {}
    if banya:
        options["banya"] = True
    if manhal:
        options["manhal"] = True
    if fishing:
        options["fishing"] = True

    extra_prices = get_extra_prices_from_site()
    total = calculate_total(
        h.base_price or 0, ci, co,
        options=options if options else None,
        extra_prices=extra_prices,
    )
    summary = get_booking_summary(
        h, ci, co,
        options=options if options else None,
        extra_prices=extra_prices,
    )
    return BookingQuoteOut(
        nights=summary["nights"],
        price_per_night=float(summary["price_per_night"]),
        extras={k: float(v) for k, v in summary["extras"].items()},
        extras_total=float(summary["extras_total"]),
        subtotal=float(summary["subtotal"]),
        total=float(summary["total"]),
    )


@router.post("/submit/", response=BookingSubmitOut | dict)
def submit_booking(request, data: BookingSubmitIn):
    """Create a booking from validated form data."""
    house = HousePage.objects.filter(pk=data.house_id).first()
    if not house:
        return JsonResponse({"error": "Дом не найден"}, status=404)

    # Reuse the existing service — no formula duplication
    from booking.services import create_booking

    # Build a pseudo-POST dict for create_booking compatibility
    post_data = {
        "house": data.house_id,
        "check_in": str(data.check_in),
        "check_out": str(data.check_out),
        "name": data.name,
        "phone": data.phone,
        "telegram": data.telegram or "",
        "guest_num": str(data.guest_num),
    }
    form = BookingForm(data=post_data)
    if not form.is_valid():
        errors = {k: v[0] for k, v in form.errors.items()}
        return JsonResponse({"error": "Ошибка валидации", "details": errors}, status=400)

    try:
        booking = create_booking(form)
        return BookingSubmitOut(
            id=booking.id,
            name=booking.name,
            status="confirmed" if booking.is_confirmed else "pending",
        )
    except BookingServiceError as e:
        return JsonResponse({"error": str(e)}, status=409)
