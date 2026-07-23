from django.shortcuts import redirect
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.db import connection
from .forms import BookingForm


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
