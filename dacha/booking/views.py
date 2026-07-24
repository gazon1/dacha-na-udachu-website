from decimal import Decimal

from django.shortcuts import redirect
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.utils.http import url_has_allowed_host_and_scheme
from django.db import IntegrityError
from datetime import date

from .forms import BookingForm
from .availability import is_available, get_booked_dates
from .services import calculate_total


@require_POST
def submit_booking(request):
    form = BookingForm(request.POST)
    if form.is_valid():
        try:
            # Snapshot prices at booking time — do NOT recompute later
            booking = form.save(commit=False)

            house = booking.house
            base_price = getattr(house, "base_price", None) or Decimal("0")

            # Selected extras from POST (e.g. banya, manhal, fishing checkboxes)
            extra_options = {}
            for key in ["banya", "manhal", "fishing"]:
                extra_options[key] = request.POST.get(key) == "on"

            # Get extra prices from SiteSettings
            extra_prices = None
            try:
                from core.models import SiteSettings
                extra_prices = SiteSettings.objects.get().get_extra_prices()
            except Exception:
                pass  # fallback to DEFAULT_EXTRA_PRICES in services

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
            booking.save()

            messages.success(request, "Ваша заявка успешно отправлена!")
        except IntegrityError:
            # Overlapping confirmed booking for same house — DB constraint violation
            messages.error(request, "Эти даты уже заняты. Попробуйте другие.")
    else:
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
    return _redirect_back(request)


def _redirect_back(request):
    """Safe redirect — validates HTTP_REFERER against allowed hosts."""
    referer = request.META.get("HTTP_REFERER", "/")
    if url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
        return redirect(referer)
    return redirect("/")


def availability(request):
    """Return availability and booked dates for a house."""
    house_id = request.GET.get("house")
    check_in_str = request.GET.get("check_in")
    check_out_str = request.GET.get("check_out")

    result = {"available": True, "booked_dates": []}

    if house_id:
        result["booked_dates"] = get_booked_dates(int(house_id))

    if check_in_str and check_out_str:
        try:
            check_in = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
            if house_id:
                result["available"] = is_available(int(house_id), check_in, check_out)
        except ValueError:
            pass

    return JsonResponse(result)
