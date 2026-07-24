from decimal import Decimal
from datetime import date

# Default extra prices — should eventually live on HousePage as a JSONField
# or a separate BookingOption model with ForeignKey to HousePage.
EXTRA_PRICES = {
    "banya": Decimal("500"),
    "manhal": Decimal("300"),
    "fishing": Decimal("200"),
}


def calculate_nights(check_in: date, check_out: date) -> int:
    """Calculate number of nights from check-in to check-out."""
    return (check_out - check_in).days


def calculate_total(price_per_night: Decimal, check_in: date, check_out: date, options: dict = None) -> Decimal:
    """Calculate total price for a booking.

    Args:
        price_per_night: Base price per night
        check_in: Check-in date
        check_out: Check-out date
        options: Optional dict with extras (e.g., {"banya": True, "manhal": False})

    Returns:
        Total price as Decimal
    """
    if check_out <= check_in:
        return Decimal("0")

    nights = calculate_nights(check_in, check_out)
    total = Decimal(str(price_per_night)) * nights

    # Add extras if provided
    if options:
        for option, enabled in options.items():
            if enabled and option in EXTRA_PRICES:
                total += EXTRA_PRICES[option]

    return total


def get_booking_summary(house, check_in: date, check_out: date, options: dict = None) -> dict:
    """Get a summary dict for a booking.

    Returns:
        dict with nights, price_per_night, extras_total, total
    """
    price = Decimal("0")
    if hasattr(house, "base_price"):
        price = house.base_price or Decimal("0")

    nights = calculate_nights(check_in, check_out)

    # Build extras breakdown (only for the summary dict)
    extras = {}
    for option, enabled in (options or {}).items():
        if enabled and option in EXTRA_PRICES:
            extras[option] = EXTRA_PRICES[option]

    # Total via calculate_total (DRY)
    total = calculate_total(price, check_in, check_out, options)

    return {
        "nights": nights,
        "price_per_night": price,
        "extras": extras,
        "extras_total": total - (Decimal(str(price)) * nights),
        "subtotal": Decimal(str(price)) * nights,
        "total": total,
    }
