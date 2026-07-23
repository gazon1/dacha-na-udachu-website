from decimal import Decimal
from datetime import date


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
        extra_prices = {
            "banya": Decimal("500"),
            "manhal": Decimal("300"),
            "fishing": Decimal("200"),
        }
        for option, enabled in options.items():
            if enabled and option in extra_prices:
                total += extra_prices[option]

    return total


def get_booking_summary(house, check_in: date, check_out: date, options: dict = None) -> dict:
    """Get a summary dict for a booking.

    Returns:
        dict with nights, price_per_night, extras_total, total
    """
    from houses.models import HousePage

    price = Decimal("0")
    if hasattr(house, "base_price"):
        price = house.base_price or Decimal("0")

    nights = calculate_nights(check_in, check_out)
    extras = {}
    extras_total = Decimal("0")

    if options:
        extra_prices = {
            "banya": Decimal("500"),
            "manhal": Decimal("300"),
            "fishing": Decimal("200"),
        }
        for option, enabled in options.items():
            if enabled and option in extra_prices:
                extras[option] = extra_prices[option]
                extras_total += extra_prices[option]

    total = (Decimal(str(price)) * nights) + extras_total

    return {
        "nights": nights,
        "price_per_night": price,
        "extras": extras,
        "extras_total": extras_total,
        "subtotal": Decimal(str(price)) * nights,
        "total": total,
    }
