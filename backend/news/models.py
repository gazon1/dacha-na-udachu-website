from django.db import models
from wagtail.models import Page
from wagtail.api import APIField
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from dacha.blocks import HeadingBlock, RichTextBlock, ImageBlock


class NewsPage(Page):
    """Individual news article."""

    date = models.DateField()
    main_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    summary = models.TextField(blank=True)

    body = fields.StreamField([
        ("heading", HeadingBlock()),
        ("paragraph", RichTextBlock()),
        ("image", ImageBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("date"),
        FieldPanel("main_image"),
        FieldPanel("summary"),
        FieldPanel("body"),
    ]

    @property
    def formatted_date(self):
        if self.date:
            return self.date.strftime("%d.%m.%Y")
        return ""

    api_fields = [
        APIField("date"),
        APIField("main_image"),
        APIField("summary"),
        APIField("formatted_date"),
        APIField("body"),
    ]


class NewsIndexPage(Page):
    """Index page for news articles with pagination."""

    intro = fields.StreamField([
        ("paragraph", RichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    api_fields = [
        APIField("intro"),
    ]

    def get_context(self, request):
        from django.core.paginator import Paginator
        context = super().get_context(request)
        all_news = NewsPage.objects.live().public().order_by("-date")
        paginator = Paginator(all_news, 10)
        page_number = request.GET.get("page", 1)
        context["news_pages"] = paginator.get_page(page_number)
        return context
