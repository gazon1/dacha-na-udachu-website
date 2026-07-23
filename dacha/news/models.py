from django.db import models
from wagtail import blocks
from wagtail.models import Page
from wagtail import fields
from wagtail.admin.panels import FieldPanel
from wagtail.images.blocks import ImageChooserBlock


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
        ("heading", blocks.CharBlock(form_classname="title")),
        ("paragraph", blocks.RichTextBlock()),
        ("image", ImageChooserBlock()),
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


class NewsIndexPage(Page):
    """Index page for news articles with pagination."""

    intro = fields.StreamField([
        ("paragraph", blocks.RichTextBlock()),
    ], use_json_field=True, blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("intro"),
    ]

    def get_context(self, request):
        from django.core.paginator import Paginator
        context = super().get_context(request)

        all_news = NewsPage.objects.live().public().order_by("-date")
        paginator = Paginator(all_news, 10)  # 10 per page
        page_number = request.GET.get("page", 1)
        context["news_pages"] = paginator.get_page(page_number)
        return context
