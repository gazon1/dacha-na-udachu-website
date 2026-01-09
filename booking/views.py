from django.shortcuts import redirect
from django.contrib import messages
from django.views.decorators.http import require_POST
from .forms import BookingForm

@require_POST
def submit_booking(request):
    form = BookingForm(request.POST)
    if form.is_valid():
        form.save()
        messages.success(request, "Ваша заявка успешно отправлена! Мы свяжемся с вами.")
        # Очищаем форму из сессии если нужно, или просто редиректим
    else:
        # Если есть ошибки, собираем их в сообщения, чтобы показать на странице
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
    
    # Возвращаем пользователя на ту же страницу, откуда он пришел
    return redirect(request.META.get('HTTP_REFERER', '/'))