from django.db import models
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from dacha.blocks import RichTextBlock, FaqBlock


class FAQPage(Page):
    intro = fields.StreamField([
        ("paragraph", RichTextBlock()),
    ], use_json_field=True, blank=True)

    faq_items = fields.StreamField([
        ("faq", FaqBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
        FieldPanel("faq_items"),
    ]
