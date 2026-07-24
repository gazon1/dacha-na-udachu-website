from decimal import Decimal
from datetime import date

from django.db import IntegrityError

# Module-level fallback for backwards compatibility (tests, etc.)
# In production, prices come from SiteSettings.extra_prices via the caller.
DEFAULT_EXTRA_PRICES = {
    "banya": Decimal("500"),
    "manhal": Decimal("300"),
    "fishing": Decimal("200"),
}


class BookingServiceError(Exception):
    """Raised when booking creation fails due to business logic."""
    pass


def calculate_nights(check_in: date, check_out: date) -> int:
    """Calculate number of nights from check-in to check-out."""
    return (check_out - check_in).days


def calculate_total(
    price_per_night: Decimal,
    check_in: date,
    check_out: date,
    options: dict = None,
    extra_prices: dict = None,
) -> Decimal:
    """Calculate total price for a booking.

    Args:
        price_per_night: Base price per night
        check_in: Check-in date
        check_out: Check-out date
        options: Optional dict with extras (e.g., {"banya": True, "manhal": False})
        extra_prices: Dict of {name: price} for extras. Defaults to DEFAULT_EXTRA_PRICES.

    Returns:
        Total price as Decimal
    """
    if check_out <= check_in:
        return Decimal("0")

    prices = extra_prices if extra_prices is not None else DEFAULT_EXTRA_PRICES

    nights = calculate_nights(check_in, check_out)
    total = Decimal(str(price_per_night)) * nights

    if options:
        for option, enabled in options.items():
            if enabled and option in prices:
                total += prices[option]

    return total


def get_booking_summary(
    house,
    check_in: date,
    check_out: date,
    options: dict = None,
    extra_prices: dict = None,
) -> dict:
    """Get a summary dict for a booking.

    Args:
        house: HousePage instance (or duck-typed object with base_price)
        check_in: Check-in date
        check_out: Check-out date
        options: Optional dict with extras (e.g., {"banya": True})
        extra_prices: Dict of {name: price} for extras.

    Returns:
        dict with nights, price_per_night, extras, extras_total, subtotal, total
    """
    prices = extra_prices if extra_prices is not None else DEFAULT_EXTRA_PRICES

    price = Decimal("0")
    if hasattr(house, "base_price"):
        price = house.base_price or Decimal("0")

    nights = calculate_nights(check_in, check_out)

    # Build extras breakdown (only for the summary dict)
    extras = {}
    for option, enabled in (options or {}).items():
        if enabled and option in prices:
            extras[option] = prices[option]

    # Total via calculate_total (DRY)
    total = calculate_total(price, check_in, check_out, options, extra_prices)

    return {
        "nights": nights,
        "price_per_night": price,
        "extras": extras,
        "extras_total": total - (Decimal(str(price)) * nights),
        "subtotal": Decimal(str(price)) * nights,
        "total": total,
    }


def get_extra_prices_from_site():
    """
    Fetch extra prices from SiteSettings.

    Returns:
        dict with extra prices, or DEFAULT_EXTRA_PRICES if unavailable.
    """
    try:
        from core.models import SiteSettings
        return SiteSettings.objects.get().get_extra_prices()
    except Exception:
        return DEFAULT_EXTRA_PRICES


# Extra option keys recognized by the booking form
EXTRA_OPTION_KEYS = ("banya", "manhal", "fishing")


def create_booking(
    form,
    extra_options_post: dict | None = None,
) -> "Booking":
    """
    Service-layer function to create a booking from a validated form.

    Handles all business logic: price calculation, option parsing,
    and database persistence. No HTTP concerns here.

    Args:
        form: Validated BookingForm instance.
        extra_options_post: Raw POST dict with extra option flags.
            Keys are option names, values should be "on" for enabled.

    Returns:
        Created Booking instance.

    Raises:
        BookingServiceError: If prices cannot be determined.
    """
    booking = form.save(commit=False)

    house = booking.house
    base_price = getattr(house, "base_price", None) or Decimal("0")

    # Parse extra options from POST
    extra_options = {}
    if extra_options_post:
        for key in EXTRA_OPTION_KEYS:
            extra_options[key] = extra_options_post.get(key) == "on"

    extra_prices = get_extra_prices_from_site()

    total = calculate_total(
        base_price,
        booking.check_in,
        booking.check_out,
        options=extra_options if any(extra_options.values()) else None,
        extra_prices=extra_prices,
    )

    booking.base_price = base_price
    booking.extras_price = total - (base_price * max(1, (booking.check_out - booking.check_in).days))
    booking.total_price = total
    booking.options = extra_options

    try:
        booking.save()
    except IntegrityError as e:
        raise BookingServiceError("Dates already booked") from e

    return booking
