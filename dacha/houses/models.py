from django.db import models
from wagtail.models import Page
from wagtail.api import APIField
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock
from dacha.blocks import HeadingBlock, RichTextBlock, ImageBlock


class HousePage(Page):
    summary = models.CharField(max_length=255, blank=True)
    hero_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    capacity = models.IntegerField(default=1)
    bedrooms = models.IntegerField(default=1)
    address = models.CharField(max_length=255, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    booking_enabled = models.BooleanField(default=True)

    body = fields.StreamField([
        ("heading", HeadingBlock()),
        ("paragraph", RichTextBlock()),
        ("image", ImageBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("summary"),
        FieldPanel("hero_image"),
        FieldPanel("capacity"),
        FieldPanel("bedrooms"),
        FieldPanel("address"),
        FieldPanel("base_price"),
        FieldPanel("booking_enabled"),
        FieldPanel("body"),
    ]

    api_fields = [
        APIField("summary"),
        APIField("hero_image"),
        APIField("capacity"),
        APIField("bedrooms"),
        APIField("address"),
        APIField("base_price"),
        APIField("booking_enabled"),
        APIField("body"),
    ]


class HousesIndexPage(Page):
    intro = fields.StreamField([
        ("paragraph", RichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    def get_context(self, request):
        context = super().get_context(request)
        context["houses"] = HousePage.objects.live().public()
        return context
