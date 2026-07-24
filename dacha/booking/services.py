from decimal import Decimal
from datetime import date

# Module-level fallback for backwards compatibility (tests, etc.)
# In production, prices come from SiteSettings.extra_prices via the caller.
DEFAULT_EXTRA_PRICES = {
    "banya": Decimal("500"),
    "manhal": Decimal("300"),
    "fishing": Decimal("200"),
}


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
