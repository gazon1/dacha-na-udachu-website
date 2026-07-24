from django.urls import path, re_path
from events import views

urlpatterns = [
    # Use re_path to support Unicode slugs (Wagtail pages can have Cyrillic slugs)
    re_path(r"^rsvp/(?P<slug>[^/]+)/$", views.event_rsvp, name="event_rsvp"),

    # Carpool section
    re_path(r"^carpool/(?P<slug>[^/]+)/$", views.event_carpool_section, name="event_carpool_section"),
    re_path(r"^carpool/(?P<slug>[^/]+)/add-driver/$", views.event_add_driver, name="event_add_driver"),
    re_path(r"^carpool/(?P<slug>[^/]+)/add-request/$", views.event_add_carpool_request, name="event_add_carpool_request"),
    re_path(r"^carpool/(?P<slug>[^/]+)/add-taxi/$", views.event_add_taxi_pool, name="event_add_taxi_pool"),

    # Ride actions
    path("ride/<int:driver_id>/join/", views.event_join_ride, name="event_join_ride"),
    path("ride/<int:driver_id>/cancel/", views.event_cancel_ride, name="event_cancel_ride"),

    # Taxi pool
    path("taxi/<int:pool_id>/join/", views.event_join_taxi, name="event_join_taxi"),

    # iCal
    re_path(r"^ical/(?P<slug>[^/]+)/$", views.event_ical, name="event_ical"),
]
