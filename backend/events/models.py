import datetime
import uuid

from django.db import models
from django.db.models import F, Count, Q, Sum, Value
from django.http import HttpResponse
from django.template.loader import render_to_string
from django_ratelimit.decorators import ratelimit

from wagtail import blocks
from wagtail.models import Page, PageManager, PageQuerySet
from wagtail.api import APIField
from wagtail.contrib.routable_page.models import RoutablePageMixin, route
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock

from dacha.blocks import (
    InfoCardBlock, FaqBlock, CtaCardBlock, AmenityItemBlock,
    RichTextBlock as DachaRichTextBlock,
)
from core.http_utils import htmx_error


class EventRSVP(models.Model):
    """RSVP record for a single person attending an event."""

    GOING = "going"
    MAYBE = "maybe"
    NOT_GOING = "not_going"
    WAITING = "waiting"  # event is full; user is in queue

    STATUS_CHOICES = [
        (GOING, "Иду"),
        (MAYBE, "Возможно"),
        (NOT_GOING, "Не смогу"),
        (WAITING, "В очереди"),
    ]

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    name = models.CharField("Имя", max_length=100)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default=GOING)
    guests_count = models.PositiveIntegerField("Гости", default=0)
    # Secret key returned once on creation; required to update/delete this RSVP.
    secret_key = models.CharField(max_length=64, default=uuid.uuid4, editable=False)
    # Linked UserAccount (optional — enables RSVP recovery without cookie)
    user_account = models.ForeignKey(
        "core.UserAccount",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="rsvps",
    )
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
    cancel_token = models.CharField(
        "Токен отмены",
        max_length=64,
        blank=True,
        default="",
        help_text="Секретный токен для отмены поездки. Заполняется автоматически.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Водитель"
        verbose_name_plural = "Водители"
        ordering = ["departure_date", "departure_time"]

    def __str__(self):
        return f"{self.name} — {self.car_model} ({self._seats_taken}/{self.seats_total})"

    def save(self, *args, **kwargs):
        if not self.cancel_token:
            self.cancel_token = str(uuid.uuid4())
        super().save(*args, **kwargs)

    @property
    def _seats_taken(self):
        """Use annotated _seats_confirmed when available (from with_carpool_stats)."""
        annotated = getattr(self, "_seats_confirmed", None)
        if annotated is not None:
            return annotated
        return self.seats_taken_raw()

    def seats_taken_raw(self):
        result = self.passengers.filter(status="confirmed").aggregate(s=Sum("seats"))
        return result["s"] or 0

    @property
    def seats_available(self):
        return max(0, self.seats_total - self._seats_taken)

    @classmethod
    def with_carpool_stats(cls):
        """Annotate with seat counts from confirmed passengers."""
        return cls.objects.annotate(
            _seats_confirmed=Sum(
                "passengers__seats",
                filter=Q(passengers__status="confirmed"),
            ),
        )

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
    def _passengers_count(self):
        """Use annotated _passengers_seats when available (from with_taxi_stats)."""
        annotated = getattr(self, "_passengers_seats", None)
        if annotated is not None:
            return annotated
        return self.passengers_count_raw()

    def passengers_count_raw(self):
        from django.db.models import Sum
        result = self.passengers.filter(is_active=True).aggregate(s=Sum("seats"))
        return result["s"] or 0

    @property
    def spots_left(self):
        return max(0, self.max_passengers - self._passengers_count)

    @classmethod
    def with_taxi_stats(cls):
        """Annotate with seat counts from active passengers."""
        return cls.objects.annotate(
            _passengers_seats=Sum(
                "passengers__seats",
                filter=Q(passengers__is_active=True),
            ),
        )


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


class EventPageQuerySet(PageQuerySet):
    def with_stats(self):
        """Annotate with RSVP counts and total attendees in a single query."""
        return self.annotate(
            _going_count=Count("rsvps", filter=Q(rsvps__status="going")),
            _maybe_count=Count("rsvps", filter=Q(rsvps__status="maybe")),
            _total_attendees=(
                Sum(F("rsvps__guests_count") + Value(1),
                    filter=Q(rsvps__status__in=["going", "maybe"]))
            ) or 0,
        )


class EventPageManager(PageManager):
    def get_queryset(self):
        return EventPageQuerySet(self.model, using=self._db)

    def with_stats(self):
        return self.get_queryset().with_stats()


class EventPage(RoutablePageMixin, Page):
    objects = EventPageManager()
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
    rsvp_capacity = models.PositiveIntegerField(
        "Лимит RSVPs",
        null=True,
        blank=True,
        help_text="Если указано, новые RSVPs сверх лимита попадут в очередь. Оставьте пустым — без лимита.",
    )

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
        FieldPanel("rsvp_capacity"),
        FieldPanel("body"),
    ]

    api_fields = [
        APIField("start_date"),
        APIField("end_date"),
        APIField("start_time"),
        APIField("venue"),
        APIField("venue_notes"),
        APIField("map_link"),
        APIField("hero_image"),
        APIField("summary"),
        APIField("show_countdown"),
        APIField("expected_temperature"),
        APIField("weather_note"),
        APIField("special_tag"),
        APIField("rsvp_capacity"),
        APIField("body"),
        APIField("countdown_target"),
        APIField("going_count"),
        APIField("maybe_count"),
        APIField("total_attending_db"),
    ]

    def get_template(self, request, *args, **kwargs):
        """Use event_page_new.html if available, otherwise fall back to default."""
        return "events/event_page_new.html"

    @property
    def countdown_target(self):
        """Return ISO datetime string for JS countdown, combining date + start_time in local timezone."""
        if not self.start_date:
            return None
        naive_dt = datetime.datetime.combine(
            self.start_date,
            self.start_time or datetime.time(0, 0),
        )
        return naive_dt.isoformat()

    @property
    def total_attending(self):
        """Sum of all attendees across RSVPs (going + maybe)."""
        going = self.rsvps.filter(status__in=["going", "maybe"])
        return sum(rsvp.total_attendees for rsvp in going)

    @property
    def total_attending_db(self):
        """Use annotated _total_attendees when available (from with_stats)."""
        annotated = getattr(self, "_total_attendees", None)
        if annotated is not None:
            return annotated
        return self.total_attending

    @property
    def going_count(self):
        annotated = getattr(self, "_going_count", None)
        return annotated if annotated is not None else self.rsvps.filter(status="going").count()

    @property
    def maybe_count(self):
        annotated = getattr(self, "_maybe_count", None)
        return annotated if annotated is not None else self.rsvps.filter(status="maybe").count()

    def promote_first_waiting(self) -> bool:
        """
        Promote the oldest WAITING RSVP to GOING if a spot opens.
        Called after a GOING or MAYBE RSVP is deleted or downgraded.
        Returns True if a promotion happened.
        """
        if not self.rsvp_capacity:
            return False
        confirmed = self.rsvps.filter(status__in=["going", "maybe"]).count()
        if confirmed >= self.rsvp_capacity:
            return False  # still full
        next_waiting = (
            self.rsvps.filter(status=EventRSVP.WAITING)
            .order_by("created_at")
            .first()
        )
        if next_waiting:
            next_waiting.status = EventRSVP.GOING
            next_waiting.save(update_fields=["status"])
            return True
        return False

    # ─── Routable routes ───────────────────────────────────────────────────────

    @route("rsvp/")
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    def event_rsvp(self, request):
        """Handle RSVP form submission via HTMX."""
        from django.db import transaction
        from events.forms import RSVPForm

        form = RSVPForm(request.POST)
        if not form.is_valid():
            return htmx_error("Имя обязательно")

        submitted_key = request.POST.get("secret_key", "")

        with transaction.atomic():
            existing = EventRSVP.objects.filter(
                event=self,
                name=form.cleaned_data["name"],
            ).first()

            new_status = form.cleaned_data["status"]

            if existing:
                # Require secret_key to update another user's RSVP.
                if submitted_key != existing.secret_key:
                    return htmx_error("RSVP уже существует. Укажите secret_key.", status=403)
                old_status = existing.status
                existing.status = new_status
                existing.guests_count = form.cleaned_data["guests_count"]
                existing.save(update_fields=["status", "guests_count"])
                rsvp = existing
                created = False
                secret_key = existing.secret_key
                # If the user changed away from going/maybe, promote from queue
                if (
                    old_status in ("going", "maybe")
                    and new_status == "not_going"
                ):
                    self.promote_first_waiting()
            else:
                # Check capacity — if full, put in waiting list
                effective_status = new_status
                if (
                    self.rsvp_capacity
                    and new_status in ("going", "maybe")
                ):
                    confirmed = self.rsvps.filter(status__in=["going", "maybe"]).count()
                    if confirmed >= self.rsvp_capacity:
                        effective_status = EventRSVP.WAITING

                rsvp = EventRSVP.objects.create(
                    event=self,
                    name=form.cleaned_data["name"],
                    status=effective_status,
                    guests_count=form.cleaned_data["guests_count"],
                )
                created = True
                secret_key = rsvp.secret_key

        response = HttpResponse(render_to_string("events/components/_sidebar_rsvp.html", {
            "page": self,
            "rsvp_secret_key": secret_key if created else None,
            "rsvp_id": rsvp.id if created else None,
        }, request=request))
        if created:
            # Trigger front-end confirmation toast
            response["HX-Trigger"] = "rsvp-confirmed"
        return response

    @route("rsvp-cancel/")
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    def event_cancel_rsvp(self, request):
        """Cancel/delete an RSVP. Reads rsvp_id + secret_key from POST body."""
        from django.db import transaction
        rsvp_id = request.POST.get("rsvp_id")
        secret_key = request.POST.get("secret_key", "")
        if not rsvp_id:
            return htmx_error("Не указан ID заявки", status=400)
        with transaction.atomic():
            try:
                rsvp = EventRSVP.objects.get(id=int(rsvp_id), event=self)
            except (EventRSVP.DoesNotExist, ValueError):
                return htmx_error("RSVP не найден", status=404)
            if rsvp.secret_key != secret_key:
                return htmx_error("Неверный ключ", status=403)
            was_confirmed = rsvp.status in ("going", "maybe")
            rsvp.delete()
            # Promote first waiting RSVP to fill the freed spot
            if was_confirmed:
                self.promote_first_waiting()
        return HttpResponse(render_to_string("events/components/_sidebar_rsvp.html", {
            "page": self,
        }, request=request))

    @route("whos-coming/")
    def event_whos_coming(self, request):
        """
        Paginated list of attendees (names only, no emails/phone).
        Shows 25 per page. Accessible only via HTMX (returns partial).
        """
        from django.core.paginator import Paginator
        going = self.rsvps.filter(
            status__in=["going", "maybe"]
        ).order_by("-created_at")
        page_num = request.GET.get("page", "1")
        paginator = Paginator(going, 25)
        page_obj = paginator.get_page(page_num)
        return HttpResponse(render_to_string("events/components/_attendees_list.html", {
            "page": self,
            "page_obj": page_obj,
        }, request=request))

    @route("carpool/")
    def event_carpool_section(self, request):
        """Return full carpool section HTML."""
        from events.forms import DriverForm, CarpoolRequestForm, TaxiPoolForm
        return HttpResponse(render_to_string("events/components/_drivers.html", {
            "page": self,
            "driver_form": DriverForm(),
            "carpool_request_form": CarpoolRequestForm(),
            "taxi_pool_form": TaxiPoolForm(),
        }, request=request))

    @route("carpool/add-driver/")
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    def event_add_driver(self, request):
        """Add a new driver offer."""
        if request.method != "POST":
            return htmx_error("Метод не поддерживается", status=405)
        from events.forms import DriverForm, CarpoolRequestForm, TaxiPoolForm
        form = DriverForm(request.POST)
        if not form.is_valid():
            return htmx_error("Заполните обязательные поля")

        driver = form.save(commit=False)
        driver.event = self
        driver.save()

        return HttpResponse(render_to_string("events/components/_drivers.html", {
            "page": self,
            "success": f"Машина добавлена! {self.url}#driver-{driver.id}",
            "driver_form": DriverForm(),
            "carpool_request_form": CarpoolRequestForm(),
            "taxi_pool_form": TaxiPoolForm(),
        }, request=request))

    @route("carpool/add-request/")
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    def event_add_carpool_request(self, request):
        """Add a ride request (looking for a ride)."""
        if request.method != "POST":
            return htmx_error("Метод не поддерживается", status=405)
        from events.forms import DriverForm, CarpoolRequestForm, TaxiPoolForm
        form = CarpoolRequestForm(request.POST)
        if not form.is_valid():
            return htmx_error("Заполните обязательные поля")

        carpool = form.save(commit=False)
        carpool.event = self
        carpool.save()

        return HttpResponse(render_to_string("events/components/_drivers.html", {
            "page": self,
            "driver_form": DriverForm(),
            "carpool_request_form": CarpoolRequestForm(),
            "taxi_pool_form": TaxiPoolForm(),
        }, request=request))

    @route("carpool/add-taxi/")
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    def event_add_taxi_pool(self, request):
        """Create a shared taxi pool."""
        if request.method != "POST":
            return htmx_error("Метод не поддерживается", status=405)
        from events.forms import DriverForm, CarpoolRequestForm, TaxiPoolForm
        form = TaxiPoolForm(request.POST)
        if not form.is_valid():
            return htmx_error("Заполните обязательные поля")

        pool = form.save(commit=False)
        pool.event = self
        pool.save()

        return HttpResponse(render_to_string("events/components/_drivers.html", {
            "page": self,
            "driver_form": DriverForm(),
            "carpool_request_form": CarpoolRequestForm(),
            "taxi_pool_form": TaxiPoolForm(),
        }, request=request))

    @route("ical/")
    def event_ical(self, request):
        """Generate a minimal .ics calendar file for the event."""
        start = datetime.datetime.combine(self.start_date, self.start_time or datetime.time(12, 0))
        end = datetime.datetime.combine(self.end_date or self.start_date, datetime.time(23, 59))

        uid = f"{self.slug}@dacha.local"
        summary = self.title
        location = self.venue or ""

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Dacha//Event//RU",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
            f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
            f"SUMMARY:{summary}",
            f"LOCATION:{location}",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        ics = "\r\n".join(lines)

        response = HttpResponse(ics, content_type="text/calendar; charset=utf-8")
        response["Content-Disposition"] = f"attachment; filename={self.slug}.ics"
        return response


class EventsIndexPage(Page):
    intro = fields.StreamField([
        ("paragraph", DachaRichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    def get_context(self, request):
        from django.utils import timezone
        from django_tables2 import RequestConfig
        from .filters import EventPageFilterSet
        from .tables import PastEventTable

        context = super().get_context(request)
        now = timezone.now().date()
        upcoming = EventPage.objects.filter(
            start_date__gte=now
        ).live().public().order_by("start_date").with_stats()
        context["upcoming_events"] = upcoming
        context["featured_event"] = upcoming.first()
        context["grid_events"] = list(upcoming[1:])

        # Past events with django-filter + django-tables2
        base_qs = EventPage.objects.filter(start_date__lt=now).live().public()
        past_filter = EventPageFilterSet(request.GET, queryset=base_qs)
        past_table = PastEventTable(past_filter.qs)
        RequestConfig(request, paginate={"per_page": 25}).configure(past_table)

        context["past_filter"] = past_filter
        context["past_table"] = past_table

        # Sum all attendees across upcoming events (uses annotated _going_count/_maybe_count)
        total = sum(e.total_attending_db for e in upcoming)
        context["total_participants"] = total

        return context
