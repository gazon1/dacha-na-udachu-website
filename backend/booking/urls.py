from django.urls import path
from . import views

urlpatterns = [
    path("", views.booking_page, name="booking_page"),
    path("submit/", views.submit_booking, name="submit_booking"),
    path("availability/", views.availability, name="availability"),
]
