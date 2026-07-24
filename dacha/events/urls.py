from django.urls import path, re_path
from events import views

urlpatterns = [
    # Use re_path to support Unicode slugs (Wagtail pages can have Cyrillic slugs)
    re_path(r"^rsvp/(?P<slug>[^/]+)/$", views.event_rsvp, name="event_rsvp"),
    path("ride/<int:driver_id>/join/", views.event_join_ride, name="event_join_ride"),
    re_path(r"^ical/(?P<slug>[^/]+)/$", views.event_ical, name="event_ical"),
]
