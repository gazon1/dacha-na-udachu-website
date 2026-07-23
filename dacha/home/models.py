from django.db import models
from wagtail import blocks
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel


class HomePage(Page):
    body = fields.StreamField([
        ("heading", blocks.CharBlock(form_classname="title")),
        ("paragraph", blocks.RichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("body"),
    ]
