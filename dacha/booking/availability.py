from django.db.models import Q
from datetime import date


def get_booked_dates(house_id: int):
    """Return list of booked date ranges for a house."""
    from .models import Booking

    bookings = Booking.objects.filter(
        house_id=house_id,
        is_confirmed=True,
    ).values_list("check_in", "check_out")

    dates = []
    for check_in, check_out in bookings:
        if check_in and check_out:
            current = check_in
            while current < check_out:
                dates.append(current.isoformat())
                current += __import__("datetime").timedelta(days=1)
    return dates


def is_available(house_id: int, check_in: date, check_out: date) -> bool:
    """Check if house is available for given dates."""
    from .models import Booking

    return not Booking.objects.filter(
        house_id=house_id,
        is_confirmed=True,
    ).filter(
        Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
    ).exists()
