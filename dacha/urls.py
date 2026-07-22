from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from booking.views import submit_booking, health_check  # <-- Импорт

urlpatterns = [
    path('admin/', admin.site.urls),
    path('booking/submit/', submit_booking, name='submit_booking'), # <-- Путь для отправки
    path('health/', health_check, name='health_check'),
    path('', include('cms.urls')),
] 

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)