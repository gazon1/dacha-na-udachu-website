from django.db import models
from wagtail import blocks
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock
from dacha.blocks import (
    InfoCardBlock, FaqBlock, CtaCardBlock, AmenityItemBlock,
    RichTextBlock as DachaRichTextBlock,
)


class EventRSVP(models.Model):
    """RSVP record for a single person attending an event."""

    GOING = "going"
    MAYBE = "maybe"
    NOT_GOING = "not_going"

    STATUS_CHOICES = [
        (GOING, "Иду"),
        (MAYBE, "Возможно"),
        (NOT_GOING, "Не смогу"),
    ]

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    name = models.CharField("Имя", max_length=100)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default=GOING)
    guests_count = models.PositiveIntegerField("Гости", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "RSVP"
        verbose_name_plural = "RSVP-записи"
        ordering = ["-created_at"]
        unique_together = [["event", "name"]]

    def __str__(self):
        return f"{self.name} — {self.get_status_display()} ({self.guests_count} гостей)"

    @property
    def total_attendees(self):
        """Total people attending including the RSVP holder plus guests."""
        if self.status == self.NOT_GOING:
            return 0
        return 1 + self.guests_count


class EventDriver(models.Model):
    """Driver/offer for a shared ride to an event."""

    CONTACT_TELEGRAM = "telegram"
    CONTACT_PHONE = "phone"
    CONTACT_BOTH = "both"
    CONTACT_CHOICES = [
        (CONTACT_TELEGRAM, "Telegram"),
        (CONTACT_PHONE, "Телефон"),
        (CONTACT_BOTH, "Оба"),
    ]

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="drivers",
    )
    name = models.CharField("Имя", max_length=100)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    car_model = models.CharField("Марка/цвет авто", max_length=100, blank=True)
    car_type = models.CharField("Тип авто", max_length=50, blank=True)
    seats_total = models.PositiveIntegerField("Всего мест", default=4)
    departure_date = models.DateField("Дата выезда", null=True, blank=True)
    departure_time = models.TimeField("Время выезда", null=True, blank=True)
    departure_location = models.CharField("Откуда", max_length=200, blank=True)
    return_date = models.DateField("Дата обратно", null=True, blank=True)
    return_time = models.TimeField("Время обратно", null=True, blank=True)
    notes = models.TextField("Заметки", blank=True)
    is_verified = models.BooleanField("Проверен", default=False)
    is_cancelled = models.BooleanField("Отменено", default=False)
    contact_preference = models.CharField("Предпочтение связи", max_length=20, choices=CONTACT_CHOICES, default=CONTACT_TELEGRAM)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Водитель"
        verbose_name_plural = "Водители"
        ordering = ["departure_date", "departure_time"]

    def __str__(self):
        return f"{self.name} — {self.car_model} ({self.seats_taken()}/{self.seats_total})"

    def seats_taken(self):
        return self.passengers.filter(status="confirmed").count()

    @property
    def seats_available(self):
        return max(0, self.seats_total - self.seats_taken())

    @property
    def telegram_url(self):
        if self.telegram:
            username = self.telegram.lstrip("@")
            return f"https://t.me/{username}"
        return None


class RidePassenger(models.Model):
    """Passenger joined a driver's ride."""

    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Ожидает"),
        (STATUS_CONFIRMED, "Подтверждено"),
        (STATUS_CANCELLED, "Отменено"),
    ]

    driver = models.ForeignKey(
        EventDriver,
        on_delete=models.CASCADE,
        related_name="passengers",
    )
    name = models.CharField("Имя", max_length=100)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    seats = models.PositiveIntegerField("Мест", default=1)
    pickup_location = models.CharField("Откуда заберет", max_length=200, blank=True)
    notes = models.TextField("Заметки", blank=True)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Попутчик"
        verbose_name_plural = "Попутчики"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.seats} мест) — {self.get_status_display()}"


class CarpoolRequest(models.Model):
    """Person looking for a ride."""

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="carpool_requests",
    )
    name = models.CharField("Имя", max_length=100)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    pickup_location = models.CharField("Откуда", max_length=200, blank=True)
    flexible_time = models.BooleanField("Гибкое время", default=False)
    seats_needed = models.PositiveIntegerField("Сколько мест", default=1)
    can_share_gas = models.BooleanField("Могу скинуться", default=False)
    notes = models.TextField("Заметки", blank=True)
    is_active = models.BooleanField("Активно", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ищу попутку"
        verbose_name_plural = "Ищу попутку"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — ищет {self.seats_needed} мест от {self.pickup_location}"


class TaxiPool(models.Model):
    """Shared taxi pool."""

    SERVICE_YANDEX = "yandex"
    SERVICE_CITYMOBIL = "citymobil"
    SERVICE_OTHER = "other"
    SERVICE_CHOICES = [
        (SERVICE_YANDEX, "Яндекс"),
        (SERVICE_CITYMOBIL, "Ситимобил"),
        (SERVICE_OTHER, "Другое"),
    ]

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="taxi_pools",
    )
    organizer = models.CharField("Организатор", max_length=100)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    pickup_location = models.CharField("Точка сбора", max_length=200)
    departure_date = models.DateField("Дата")
    departure_time = models.TimeField("Время")
    max_passengers = models.PositiveIntegerField("Макс. пассажиров", default=4)
    estimated_price = models.PositiveIntegerField("Цена с человека", default=0)
    service = models.CharField("Сервис", max_length=20, choices=SERVICE_CHOICES, default=SERVICE_YANDEX)
    notes = models.TextField("Заметки", blank=True)
    is_active = models.BooleanField("Активно", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Такси-пул"
        verbose_name_plural = "Такси-пулы"
        ordering = ["departure_date", "departure_time"]

    def __str__(self):
        return f"Такси {self.departure_date} в {self.departure_time} от {self.pickup_location}"

    @property
    def passengers_count(self):
        return self.passengers.filter(is_active=True).count()

    @property
    def spots_left(self):
        return max(0, self.max_passengers - self.passengers_count)


class TaxiPassenger(models.Model):
    """Person joined a taxi pool."""

    taxi = models.ForeignKey(
        TaxiPool,
        on_delete=models.CASCADE,
        related_name="passengers",
    )
    name = models.CharField("Имя", max_length=100)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    seats = models.PositiveIntegerField("Мест", default=1)
    notes = models.TextField("Заметки", blank=True)
    is_active = models.BooleanField("Активно", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Пассажир такси"
        verbose_name_plural = "Пассажиры такси"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.seats} мест в такси"


class EventPage(Page):
    start_date = models.DateField("Дата начала")
    end_date = models.DateField("Дата окончания", null=True, blank=True)
    start_time = models.TimeField("Время начала", null=True, blank=True)
    venue = models.TextField("Место", blank=True)
    venue_notes = models.TextField("Заметки как добраться", blank=True, help_text="Дополнительные инструкции: через какой въезд, что захватить, особые указания")
    map_link = models.URLField("Ссылка на карту", blank=True, help_text="Ссылка на Яндекс.Карты/Google Maps с местом")
    hero_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    summary = models.TextField("Краткое описание", blank=True)
    show_countdown = models.BooleanField("Показывать обратный отсчёт", default=True)
    expected_temperature = models.CharField("Ожидаемая температура", max_length=20, blank=True, help_text='Например: "14°C"')
    weather_note = models.CharField("Заметка о погоде", max_length=100, blank=True, help_text='Например: "Прохладный лесной вечер"')
    special_tag = models.CharField("Тег события", max_length=50, blank=True, help_text='Например: "HOT", "NEW", "FREE"')

    body = fields.StreamField([
        ("heading", blocks.CharBlock(form_classname="title")),
        ("paragraph", DachaRichTextBlock()),
        ("image", ImageChooserBlock()),
        ("info_card", InfoCardBlock()),
        ("faq", FaqBlock()),
        ("cta", CtaCardBlock()),
        ("amenity_list", blocks.ListBlock(AmenityItemBlock())),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("start_date"),
        FieldPanel("end_date"),
        FieldPanel("start_time"),
        FieldPanel("venue"),
        FieldPanel("venue_notes"),
        FieldPanel("map_link"),
        FieldPanel("hero_image"),
        FieldPanel("summary"),
        FieldPanel("show_countdown"),
        FieldPanel("expected_temperature"),
        FieldPanel("weather_note"),
        FieldPanel("special_tag"),
        FieldPanel("body"),
    ]

    def get_template(self, request, *args, **kwargs):
        """Use event_page_new.html if available, otherwise fall back to default."""
        return "events/event_page_new.html"

    @property
    def countdown_target(self):
        """Return ISO date string for JS countdown."""
        if self.start_date:
            return self.start_date.isoformat()
        return None

    @property
    def total_attending(self):
        """Sum of all attendees across RSVPs (going + maybe)."""
        going = self.rsvps.filter(status__in=["going", "maybe"])
        return sum(rsvp.total_attendees for rsvp in going)

    @property
    def going_count(self):
        return self.rsvps.filter(status="going").count()

    @property
    def maybe_count(self):
        return self.rsvps.filter(status="maybe").count()


class EventsIndexPage(Page):
    intro = fields.StreamField([
        ("paragraph", DachaRichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    def get_context(self, request):
        from django.utils import timezone
        context = super().get_context(request)
        now = timezone.now().date()
        upcoming = EventPage.objects.filter(
            start_date__gte=now
        ).live().public().order_by("start_date")
        context["upcoming_events"] = upcoming
        context["featured_event"] = upcoming.first()  # already shown as featured, excluded from grid
        context["grid_events"] = list(upcoming[1:])  # rest for the grid (no duplicate)
        context["past_events"] = EventPage.objects.filter(
            start_date__lt=now
        ).live().public().order_by("-start_date")

        # Sum all attendees across upcoming events
        total = 0
        for e in upcoming:
            total += e.total_attending
        context["total_participants"] = total

        return context
