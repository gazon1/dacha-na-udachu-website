from django.shortcuts import redirect
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.db import connection
from datetime import date
from .forms import BookingForm
from .availability import is_available, get_booked_dates


@require_POST
def submit_booking(request):
    form = BookingForm(request.POST)
    if form.is_valid():
        form.save()
        messages.success(request, "Ваша заявка успешно отправлена!")
    else:
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
    return redirect(request.META.get("HTTP_REFERER", "/"))


def health_check(request):
    try:
        connection.ensure_connection()
        return JsonResponse({"status": "ok"})
    except Exception as e:
        return JsonResponse({"status": "error", "detail": str(e)}, status=503)


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
