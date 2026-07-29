from django.db import models
from wagtail.models import Page
from wagtail.api import APIField
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from dacha.blocks import HeroBlock, FeaturesBlock, RichTextBlock, ImageBlock, CTABlock, NewsletterBlock


class HomePage(Page):
    body = fields.StreamField(
        [
            ("hero", HeroBlock()),
            ("features", FeaturesBlock()),
            ("text", RichTextBlock()),
            ("image", ImageBlock()),
            ("cta", CTABlock()),
            ("newsletter", NewsletterBlock()),
        ],
        use_json_field=True,
        blank=True,
    )

    content_panels = Page.content_panels + [
        FieldPanel("body"),
    ]

    api_fields = [
        APIField("body"),
    ]
