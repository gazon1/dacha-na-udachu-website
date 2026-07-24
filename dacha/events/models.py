from django.db import models
from wagtail import blocks
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock
from dacha.blocks import (
    InfoCardBlock, FaqBlock, CtaCardBlock, AmenitiesBlock,
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

    event = models.ForeignKey(
        "EventPage",
        on_delete=models.CASCADE,
        related_name="drivers",
    )
    name = models.CharField("Имя", max_length=100)
    car_model = models.CharField("Марка авто", max_length=100, blank=True)
    seats_total = models.PositiveIntegerField("Всего мест", default=4)
    seats_taken = models.PositiveIntegerField("Занято", default=0)
    departure_time = models.TimeField("Время выезда", null=True, blank=True)
    departure_location = models.CharField("Откуда", max_length=200, blank=True)
    notes = models.TextField("Заметки", blank=True)
    is_verified = models.BooleanField("Проверен", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Водитель"
        verbose_name_plural = "Водители"
        ordering = ["departure_time"]

    def __str__(self):
        return f"{self.name} — {self.car_model} ({self.seats_taken}/{self.seats_total})"

    @property
    def seats_available(self):
        return max(0, self.seats_total - self.seats_taken)


class EventPage(Page):
    start_date = models.DateField("Дата начала")
    end_date = models.DateField("Дата окончания", null=True, blank=True)
    start_time = models.TimeField("Время начала", null=True, blank=True)
    venue = models.TextField("Место", blank=True)
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
        ("amenity_list", AmenitiesBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("start_date"),
        FieldPanel("end_date"),
        FieldPanel("start_time"),
        FieldPanel("venue"),
        FieldPanel("hero_image"),
        FieldPanel("summary"),
        FieldPanel("show_countdown"),
        FieldPanel("expected_temperature"),
        FieldPanel("weather_note"),
        FieldPanel("special_tag"),
        FieldPanel("body"),
    ]

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
