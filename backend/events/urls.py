from django.urls import path
from events import views

urlpatterns = [
    # Ride actions — ID-based, no slug needed
    path("ride/<int:driver_id>/join/", views.event_join_ride, name="event_join_ride"),
    path("ride/<int:driver_id>/cancel/", views.event_cancel_ride, name="event_cancel_ride"),

    # Taxi pool
    path("taxi/<int:pool_id>/join/", views.event_join_taxi, name="event_join_taxi"),

    # NOTE: slug-based routes (rsvp, carpool, ical) are now handled
    # directly by EventPage via RoutablePageMixin — no Django URL needed.
]
