from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    # Какие поля показывать в списке (колонки)
    list_display = ("id", "name", "phone", "check_in", "check_out", "created_at", "is_confirmed")
    
    # По каким полям можно фильтровать справа
    list_filter = ("check_in", "created_at", "is_confirmed")
    
    # По каким полям работает поиск
    search_fields = ("name", "phone", "telegram")
    
    # Поле даты создания нельзя редактировать, но полезно видеть
    readonly_fields = ("created_at",)