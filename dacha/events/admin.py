from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.template.response import TemplateResponse
from django_tables2 import SingleTableMixin
from django_filters.views import FilterMixin

from .models import EventDriver, EventRSVP, RidePassenger, CarpoolRequest, TaxiPool, TaxiPassenger
from .filters import (
    EventDriverFilterSet, EventRSVPFilterSet, RidePassengerFilterSet,
    CarpoolRequestFilterSet, TaxiPoolFilterSet, TaxiPassengerFilterSet,
)
from .tables import (
    EventDriverTable, EventRSVPsTable, RidePassengerTable,
    CarpoolRequestTable, TaxiPoolTable, TaxiPassengerTable,
)


class FilteredTableAdmin(FilterMixin, SingleTableMixin, admin.ModelAdmin):
    """Base admin with django-filter + django-tables2."""
    filterset_class = None
    table_class = None
    template_name = "events/admin/filtered_table.html"
    list_display = []
    paginate_by = 25

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("event")

    def get_filterset(self, request, queryset=None):
        if queryset is None:
            queryset = self.get_queryset(request)
        return self.filterset_class(request.GET, queryset=queryset)

    def get_table_data(self, request):
        queryset = self.get_queryset(request)
        filterset = self.get_filterset(request, queryset)
        return filterset.qs

    def changelist_view(self, request, extra_context=None):
        table = self.table_class(self.get_table_data(request))
        table.paginate = getattr(self, "paginate_by", 25)
        context = self.admin_site.each_context(request)
        context.update({
            "cl": table,
            "filterset": self.get_filterset(request),
            "title": self.title,
        })
        return TemplateResponse(request, self.template_name, context)


@admin.register(EventDriver)
class EventDriverAdmin(FilteredTableAdmin):
    title = "Водители"
    filterset_class = EventDriverFilterSet
    table_class = EventDriverTable


@admin.register(EventRSVP)
class EventRSVPAdmin(FilteredTableAdmin):
    title = "RSVP-записи"
    filterset_class = EventRSVPFilterSet
    table_class = EventRSVPsTable


@admin.register(RidePassenger)
class RidePassengerAdmin(FilteredTableAdmin):
    title = "Попутчики (машины)"
    filterset_class = RidePassengerFilterSet
    table_class = RidePassengerTable


@admin.register(CarpoolRequest)
class CarpoolRequestAdmin(FilteredTableAdmin):
    title = "Ищу попутку"
    filterset_class = CarpoolRequestFilterSet
    table_class = CarpoolRequestTable


@admin.register(TaxiPool)
class TaxiPoolAdmin(FilteredTableAdmin):
    title = "Такси-пулы"
    filterset_class = TaxiPoolFilterSet
    table_class = TaxiPoolTable


@admin.register(TaxiPassenger)
class TaxiPassengerAdmin(FilteredTableAdmin):
    title = "Пассажиры такси"
    filterset_class = TaxiPassengerFilterSet
    table_class = TaxiPassengerTable
