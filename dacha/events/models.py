from django.db import models
from wagtail import blocks
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock


class EventPage(Page):
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True)
    hero_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    summary = models.TextField(blank=True)
    show_countdown = models.BooleanField(default=True, verbose_name="Показывать обратный отсчёт")

    body = fields.StreamField([
        ("heading", blocks.CharBlock(form_classname="title")),
        ("paragraph", blocks.RichTextBlock()),
        ("image", ImageChooserBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("start_date"),
        FieldPanel("end_date"),
        FieldPanel("venue"),
        FieldPanel("hero_image"),
        FieldPanel("summary"),
        FieldPanel("show_countdown"),
        FieldPanel("body"),
    ]

    @property
    def countdown_target(self):
        """Return ISO date string for JS countdown."""
        if self.start_date:
            return self.start_date.isoformat()
        return None


class EventsIndexPage(Page):
    intro = fields.StreamField([
        ("paragraph", blocks.RichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    def get_context(self, request):
        from django.utils import timezone
        context = super().get_context(request)
        now = timezone.now().date()
        context["upcoming_events"] = EventPage.objects.filter(
            start_date__gte=now
        ).live().public().order_by("start_date")
        context["past_events"] = EventPage.objects.filter(
            start_date__lt=now
        ).live().public().order_by("-start_date")
        return context
