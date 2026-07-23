from wagtail import blocks
from wagtail.images.blocks import ImageChooserBlock


class HeroBlock(blocks.StructBlock):
    """Hero section with title, subtitle, and CTA."""

    title = blocks.CharBlock(max_length=200, template="blocks/hero_block.html")
    subtitle = blocks.TextBlock(required=False)
    button_text = blocks.CharBlock(max_length=100, required=False)
    button_url = blocks.URLBlock(required=False)

    class Meta:
        icon = "hero"
        template = "blocks/hero_block.html"


class FeaturesBlock(blocks.StructBlock):
    """Features/chips section."""

    title = blocks.CharBlock(max_length=200)
    features = blocks.ListBlock(
        blocks.StructBlock([
            ("icon", blocks.CharBlock(max_length=50, required=False)),
            ("text", blocks.CharBlock(max_length=100)),
        ])
    )

    class Meta:
        icon = "list-ul"
        template = "blocks/features_block.html"


class TextBlock(blocks.RichTextBlock):
    """Simple rich text block."""

    class Meta:
        icon = "pilcrow"
        template = "blocks/text_block.html"


class ImageBlock(blocks.StructBlock):
    """Image with optional caption."""

    image = ImageChooserBlock()
    caption = blocks.CharBlock(max_length=200, required=False)

    class Meta:
        icon = "image"
        template = "blocks/image_block.html"


class CTABlock(blocks.StructBlock):
    """Call to action block."""

    title = blocks.CharBlock(max_length=200)
    description = blocks.TextBlock(required=False)
    button_text = blocks.CharBlock(max_length=100)
    button_url = blocks.URLBlock()

    class Meta:
        icon = "link"
        template = "blocks/cta_block.html"


class NewsletterBlock(blocks.StructBlock):
    """Newsletter signup block."""

    title = blocks.CharBlock(max_length=200, default="Подпишитесь на новости")
    description = blocks.TextBlock(required=False)

    class Meta:
        icon = "mail"
        template = "blocks/newsletter_block.html"
