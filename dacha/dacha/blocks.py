"""
Shared StreamField block library — single source of truth for all content blocks.

Blocks defined here are available to all Wagtail page models (home, events, news, houses, faq).
Templates live in dacha/templates/includes/blocks/ and are referenced as includes/blocks/<name>.html.
"""

from wagtail import blocks
from wagtail.images.blocks import ImageChooserBlock


# ─── Content blocks ───────────────────────────────────────────────────────────

class HeadingBlock(blocks.CharBlock):
    """H2/H3 heading block for use in StreamFields."""

    class Meta:
        icon = "title"
        template = "includes/blocks/heading.html"


class RichTextBlock(blocks.RichTextBlock):
    """Rich text with prose styling."""

    class Meta:
        icon = "pilcrow"
        template = "includes/blocks/paragraph.html"


class ImageBlock(blocks.StructBlock):
    """Image with optional caption."""

    image = ImageChooserBlock()
    caption = blocks.CharBlock(max_length=200, required=False)

    class Meta:
        icon = "image"
        template = "includes/blocks/image.html"


# ─── Marketing / landing blocks ───────────────────────────────────────────────

class HeroBlock(blocks.StructBlock):
    """Hero section — title, subtitle, CTA button."""

    title = blocks.CharBlock(max_length=200)
    subtitle = blocks.TextBlock(required=False)
    button_text = blocks.CharBlock(max_length=100, required=False)
    button_url = blocks.URLBlock(required=False)

    class Meta:
        icon = "cogs"
        template = "includes/blocks/hero.html"


class FeaturesBlock(blocks.StructBlock):
    """Feature list with Material Symbol icons."""

    title = blocks.CharBlock(max_length=200, required=False)
    features = blocks.ListBlock(
        blocks.StructBlock([
            ("icon", blocks.CharBlock(max_length=50, required=False,
                                     help_text="Material Symbol name e.g. 'star', 'home', 'event'")),
            ("text", blocks.CharBlock(max_length=100)),
        ])
    )

    class Meta:
        icon = "list-ul"
        template = "includes/blocks/features.html"


class CTABlock(blocks.StructBlock):
    """Call-to-action section."""

    title = blocks.CharBlock(max_length=200)
    description = blocks.TextBlock(required=False)
    button_text = blocks.CharBlock(max_length=100)
    button_url = blocks.URLBlock()

    class Meta:
        icon = "link"
        template = "includes/blocks/cta.html"


class NewsletterBlock(blocks.StructBlock):
    """Newsletter signup — htmx-powered inline form."""

    title = blocks.CharBlock(max_length=200, default="Подпишитесь на новости")
    description = blocks.TextBlock(required=False)

    class Meta:
        icon = "mail"
        template = "includes/blocks/newsletter.html"


# ─── Event / content card blocks ──────────────────────────────────────────────

class InfoCardBlock(blocks.StructBlock):
    """Icon + title + rich-text card — dress-code, amenities, etc."""

    icon = blocks.CharBlock(
        max_length=50, required=False,
        default="info",
        help_text="Material Symbol name e.g. 'checkroom', 'local_cafe', 'chair'"
    )
    title = blocks.CharBlock(max_length=100)
    content = blocks.RichTextBlock()

    class Meta:
        icon = "doc-full"
        template = "includes/blocks/info_card.html"


class FaqBlock(blocks.StructBlock):
    """Accordion item — question + rich-text answer."""

    question = blocks.CharBlock(max_length=200)
    answer = blocks.RichTextBlock()

    class Meta:
        icon = "help"
        template = "includes/blocks/faq.html"


class AmenityItemBlock(blocks.StructBlock):
    """Single amenity icon + label card."""

    icon = blocks.CharBlock(
        max_length=50,
        required=False,
        default="check",
        help_text="Material Symbol name (e.g. 'checkroom', 'local_cafe', 'chair', 'confirmation_number')"
    )
    label = blocks.CharBlock(max_length=100)

    class Meta:
        icon = "image"
        template = "includes/blocks/amenity_item.html"


class CtaCardBlock(blocks.StructBlock):
    """Accent card — highlighted call-to-action block."""

    title = blocks.CharBlock(max_length=100)
    text = blocks.RichTextBlock()
    highlighted = blocks.BooleanBlock(
        required=False, default=True,
        help_text="Apply glow effect and gradient border"
    )

    class Meta:
        icon = "success"
        template = "includes/blocks/cta_card.html"
