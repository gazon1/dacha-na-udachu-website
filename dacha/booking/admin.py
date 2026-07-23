from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["name", "check_in", "check_out", "is_confirmed", "created_at"]
    list_filter = ["is_confirmed", "created_at"]
    search_fields = ["name", "phone"]
    ordering = ["-created_at"]
