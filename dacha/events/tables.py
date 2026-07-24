import django_tables2 as tables
from .models import EventDriver, EventRSVP, RidePassenger, CarpoolRequest, TaxiPool, TaxiPassenger, EventPage


class EventDriverTable(tables.Table):
    event = tables.Column(verbose_name="Событие", accessor="event.title")
    departure_date = tables.DateColumn(format="d.m.Y", verbose_name="Дата выезда")
    departure_time = tables.TimeColumn(format="H:i", verbose_name="Время")
    departure_location = tables.Column(verbose_name="Откуда")
    name = tables.Column(verbose_name="Водитель")
    car_model = tables.Column(verbose_name="Авто")
    seats_total = tables.Column(verbose_name="Всего мест")
    seats_taken = tables.Column(accessor="seats_taken", verbose_name="Занято")
    seats_available = tables.Column(accessor="seats_available", verbose_name="Свободно")
    is_verified = tables.BooleanColumn(verbose_name="Проверен")
    is_cancelled = tables.BooleanColumn(verbose_name="Отменён")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = EventDriver
        fields = [
            "event", "departure_date", "departure_time", "departure_location",
            "name", "car_model", "seats_total", "seats_taken", "seats_available",
            "is_verified", "is_cancelled", "created_at",
        ]
        order_by = "departure_date"
        attrs = {"class": "table table-hover"}
        sortable = True


class EventRSVPsTable(tables.Table):
    event = tables.Column(verbose_name="Событие", accessor="event.title")
    name = tables.Column(verbose_name="Имя")
    status = tables.Column(verbose_name="Статус")
    guests_count = tables.Column(verbose_name="Гостей")
    total_attendees = tables.Column(verbose_name="Всего", accessor="total_attendees")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = EventRSVP
        fields = ["event", "name", "status", "guests_count", "total_attendees", "created_at"]
        order_by = "-created_at"
        attrs = {"class": "table table-hover"}
        sortable = True


class RidePassengerTable(tables.Table):
    driver = tables.Column(verbose_name="Водитель", accessor="driver.name")
    event = tables.Column(verbose_name="Событие", accessor="driver.event.title")
    name = tables.Column(verbose_name="Имя")
    pickup_location = tables.Column(verbose_name="Откуда")
    seats = tables.Column(verbose_name="Мест")
    status = tables.Column(verbose_name="Статус")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = RidePassenger
        fields = ["driver", "event", "name", "pickup_location", "seats", "status", "created_at"]
        order_by = "-created_at"
        attrs = {"class": "table table-hover"}
        sortable = True


class CarpoolRequestTable(tables.Table):
    event = tables.Column(verbose_name="Событие", accessor="event.title")
    name = tables.Column(verbose_name="Имя")
    pickup_location = tables.Column(verbose_name="Откуда")
    seats_needed = tables.Column(verbose_name="Нужно мест")
    flexible_time = tables.BooleanColumn(verbose_name="Гибкое время")
    can_share_gas = tables.BooleanColumn(verbose_name="Скинусь за бензин")
    is_active = tables.BooleanColumn(verbose_name="Активно")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = CarpoolRequest
        fields = ["event", "name", "pickup_location", "seats_needed", "flexible_time", "can_share_gas", "is_active", "created_at"]
        order_by = "-created_at"
        attrs = {"class": "table table-hover"}
        sortable = True


class TaxiPoolTable(tables.Table):
    event = tables.Column(verbose_name="Событие", accessor="event.title")
    departure_date = tables.DateColumn(format="d.m.Y", verbose_name="Дата")
    departure_time = tables.TimeColumn(format="H:i", verbose_name="Время")
    pickup_location = tables.Column(verbose_name="Точка")
    organizer = tables.Column(verbose_name="Организатор")
    service = tables.Column(verbose_name="Сервис")
    max_passengers = tables.Column(verbose_name="Макс.")
    passengers_count = tables.Column(accessor="passengers_count", verbose_name="Пассажиров")
    estimated_price = tables.Column(verbose_name="Цена")
    is_active = tables.BooleanColumn(verbose_name="Активно")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = TaxiPool
        fields = [
            "event", "departure_date", "departure_time", "pickup_location",
            "organizer", "service", "max_passengers", "passengers_count",
            "estimated_price", "is_active", "created_at",
        ]
        order_by = "departure_date"
        attrs = {"class": "table table-hover"}
        sortable = True


class TaxiPassengerTable(tables.Table):
    taxi = tables.Column(verbose_name="Такси", accessor="taxi.pickup_location")
    event = tables.Column(verbose_name="Событие", accessor="taxi.event.title")
    name = tables.Column(verbose_name="Имя")
    seats = tables.Column(verbose_name="Мест")
    is_active = tables.BooleanColumn(verbose_name="Активно")
    created_at = tables.DateTimeColumn(format="d.m.Y H:i", verbose_name="Создан")

    class Meta:
        model = TaxiPassenger
        fields = ["taxi", "event", "name", "seats", "is_active", "created_at"]
        order_by = "-created_at"
        attrs = {"class": "table table-hover"}
        sortable = True


class PastEventTable(tables.Table):
    """Table for past events archive on EventsIndexPage."""
    start_date = tables.DateColumn(format="d.m.Y", verbose_name="Дата")
    title = tables.Column(verbose_name="Событие", accessor="title")
    venue = tables.Column(verbose_name="Место", accessor="venue")
    going_count = tables.Column(verbose_name="Идут", accessor="going_count")
    maybe_count = tables.Column(verbose_name="Возможно", accessor="maybe_count")
    total_attending = tables.Column(verbose_name="Всего", accessor="total_attending")

    class Meta:
        model = EventPage
        fields = ["start_date", "title", "venue", "going_count", "maybe_count", "total_attending"]
        order_by = "-start_date"
        attrs = {"class": "table table-hover"}
        sortable = True
