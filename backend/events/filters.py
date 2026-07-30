import django_filters
from .models import EventDriver, EventRSVP, RidePassenger, CarpoolRequest, TaxiPool, TaxiPassenger, EventPage


class EventDriverFilterSet(django_filters.FilterSet):
    """Filter for EventDriver — carpool driver/offer."""
    event = django_filters.NumberFilter(field_name="event__pk")
    event_title = django_filters.CharFilter(field_name="event__title", lookup_expr="icontains")
    departure_date_from = django_filters.DateFilter(field_name="departure_date", lookup_expr="gte")
    departure_date_to = django_filters.DateFilter(field_name="departure_date", lookup_expr="lte")
    departure_location = django_filters.CharFilter(lookup_expr="icontains")
    is_cancelled = django_filters.BooleanFilter()
    is_verified = django_filters.BooleanFilter()

    class Meta:
        model = EventDriver
        fields = ["event", "departure_date_from", "departure_date_to", "departure_location", "is_cancelled", "is_verified"]


class EventRSVPFilterSet(django_filters.FilterSet):
    """Filter for EventRSVP — event attendance records."""
    event = django_filters.NumberFilter(field_name="event__pk")
    event_title = django_filters.CharFilter(field_name="event__title", lookup_expr="icontains")
    status = django_filters.ChoiceFilter(choices=EventRSVP.STATUS_CHOICES)
    name = django_filters.CharFilter(lookup_expr="icontains")
    created_at_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_at_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = EventRSVP
        fields = ["event", "status", "name", "created_at_from", "created_at_to"]


class RidePassengerFilterSet(django_filters.FilterSet):
    """Filter for RidePassenger — passenger joined a driver."""
    driver = django_filters.NumberFilter(field_name="driver__pk")
    status = django_filters.ChoiceFilter(choices=RidePassenger.STATUS_CHOICES)
    name = django_filters.CharFilter(lookup_expr="icontains")
    pickup_location = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = RidePassenger
        fields = ["driver", "status", "name", "pickup_location"]


class CarpoolRequestFilterSet(django_filters.FilterSet):
    """Filter for CarpoolRequest — person looking for a ride."""
    event = django_filters.NumberFilter(field_name="event__pk")
    event_title = django_filters.CharFilter(field_name="event__title", lookup_expr="icontains")
    is_active = django_filters.BooleanFilter()
    pickup_location = django_filters.CharFilter(lookup_expr="icontains")
    can_share_gas = django_filters.BooleanFilter()

    class Meta:
        model = CarpoolRequest
        fields = ["event", "is_active", "pickup_location", "can_share_gas"]


class TaxiPoolFilterSet(django_filters.FilterSet):
    """Filter for TaxiPool — shared taxi."""
    event = django_filters.NumberFilter(field_name="event__pk")
    event_title = django_filters.CharFilter(field_name="event__title", lookup_expr="icontains")
    departure_date_from = django_filters.DateFilter(field_name="departure_date", lookup_expr="gte")
    departure_date_to = django_filters.DateFilter(field_name="departure_date", lookup_expr="lte")
    service = django_filters.ChoiceFilter(choices=TaxiPool.SERVICE_CHOICES)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = TaxiPool
        fields = ["event", "departure_date_from", "departure_date_to", "service", "is_active"]


class TaxiPassengerFilterSet(django_filters.FilterSet):
    """Filter for TaxiPassenger — passenger joined a taxi pool."""
    taxi = django_filters.NumberFilter(field_name="taxi__pk")
    is_active = django_filters.BooleanFilter()
    name = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = TaxiPassenger
        fields = ["taxi", "is_active", "name"]


class EventPageFilterSet(django_filters.FilterSet):
    """Filter for EventPage — used in EventsIndexPage past events section."""
    date_from = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="start_date", lookup_expr="lte")
    venue = django_filters.CharFilter(lookup_expr="icontains")
    title = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = EventPage
        fields = ["date_from", "date_to", "venue", "title"]
