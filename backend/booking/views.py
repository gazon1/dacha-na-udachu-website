from django.shortcuts import redirect, render
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import JsonResponse, HttpResponse
from django.utils.http import url_has_allowed_host_and_scheme
from django_ratelimit.decorators import ratelimit

from .forms import BookingForm
from .availability import is_available, get_booked_dates
from .services import create_booking, BookingServiceError


def booking_page(request):
    """Render the booking page with house selection and availability calendar."""
    from houses.models import HousePage
    import json

    houses = HousePage.objects.live().public().filter(booking_enabled=True)
    houses_data = []

    for house in houses:
        booked_dates = get_booked_dates(house.id)
        houses_data.append({
            "id": house.id,
            "title": house.title,
            "summary": house.summary,
            "capacity": house.capacity,
            "bedrooms": house.bedrooms,
            "address": house.address,
            "base_price": house.base_price,
            "hero_image_url": house.hero_image.file.url if house.hero_image else None,
            "booked_dates_json": json.dumps(booked_dates),
        })

    form = BookingForm()
    return render(request, "booking/booking_page.html", {
        "form": form,
        "houses": houses_data,
    })


@require_POST
@ratelimit(key='post:phone', rate='5/h', method='POST', block=True)
@ratelimit(key='post:house', rate='10/h', method='POST', block=True)
def submit_booking(request):
    """Submit a booking request — rate limited to prevent abuse."""
    form = BookingForm(request.POST)
    if form.is_valid():
        house = form.cleaned_data.get("house")
        check_in = form.cleaned_data.get("check_in")
        check_out = form.cleaned_data.get("check_out")

        # Check availability before attempting to create the booking
        if house and check_in and check_out:
            if not is_available(house.id, check_in, check_out):
                messages.error(request, "Эти даты уже заняты. Попробуйте другие.")
                return _redirect_back(request)

        try:
            create_booking(form, extra_options_post=request.POST)
            messages.success(request, "Ваша заявка успешно отправлена!")
        except BookingServiceError:
            messages.error(request, "Эти даты уже заняты. Попробуйте другие.")
    else:
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
    return _redirect_back(request)


def _redirect_back(request):
    """Safe redirect — validates HTTP_REFERER against allowed hosts."""
    referer = request.META.get("HTTP_REFERER", "/")
    if not url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
        referer = "/"

    if request.htmx:
        response = HttpResponse()
        response["HX-Redirect"] = referer
        return response
    return redirect(referer)


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
            from datetime import date
            check_in = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
            if house_id:
                result["available"] = is_available(int(house_id), check_in, check_out)
        except ValueError:
            pass

    return JsonResponse(result)
