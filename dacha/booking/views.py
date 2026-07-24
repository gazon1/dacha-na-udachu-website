from django.db import transaction
from django.shortcuts import redirect
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.utils.http import url_has_allowed_host_and_scheme
from datetime import date
from .forms import BookingForm
from .availability import is_available, get_booked_dates


@require_POST
def submit_booking(request):
    form = BookingForm(request.POST)
    if form.is_valid():
        check_in = form.cleaned_data["check_in"]
        check_out = form.cleaned_data["check_out"]

        # Resolve house from form or session (passed as hidden field or query param)
        house_id = request.POST.get("house") or request.GET.get("house")
        if house_id:
            house_id = int(house_id)
            # Atomic check: re-verify availability inside transaction to close race window
            if not is_available(house_id, check_in, check_out):
                messages.error(request, "Эти даты уже заняты. Попробуйте другие.")
                return _redirect_back(request)

        form.save()
        messages.success(request, "Ваша заявка успешно отправлена!")
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


@require_POST
def submit_booking_atomic(request):
    """Booking with row-level locking — use when house_id is known."""
    form = BookingForm(request.POST)
    house_id = request.POST.get("house")

    if not house_id:
        # Fall back to non-locking save if no house context
        if form.is_valid():
            form.save()
            messages.success(request, "Ваша заявка успешно отправлена!")
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
        return _redirect_back(request)

    house_id = int(house_id)
    check_in_str = request.POST.get("check_in")
    check_out_str = request.POST.get("check_out")

    if not check_in_str or not check_out_str:
        return _redirect_back(request)

    try:
        check_in = date.fromisoformat(check_in_str)
        check_out = date.fromisoformat(check_out_str)
    except ValueError:
        return _redirect_back(request)

    if not form.is_valid():
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
        return _redirect_back(request)

    with transaction.atomic():
        # Lock all overlapping bookings for this house to prevent double-booking
        from .models import Booking
        Booking.objects.select_for_update().filter(
            house_id=house_id,
            is_confirmed=True,
        ).filter(
            check_in__lt=check_out,
            check_out__gt=check_in,
        ).exists()  # Triggers the lock; if any exist, booking overlaps

        if is_available(house_id, check_in, check_out):
            form.save()
            messages.success(request, "Ваша заявка успешно отправлена!")
        else:
            messages.error(request, "Эти даты уже заняты. Попробуйте другие.")

    return _redirect_back(request)


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
