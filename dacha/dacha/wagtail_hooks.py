"""
Wagtail hooks for Draftail editor configuration and custom features.
"""
import wagtail.admin.rich_text.editors.draftail.features as draftail_features
from wagtail.admin.rich_text.converters.html_to_contentstate import (
    InlineStyleElementHandler,
    BlockElementHandler,
)
from wagtail import hooks


@hooks.register("register_rich_text_features")
def register_emojis_feature(features):
    """
    Register an 'blockquote' feature styled nicely for Telegram-style messages.
    Stores as HTML <blockquote> tag.
    """
    feature_name = "blockquote"

    control = {
        "type": feature_name,
        "icon": "quote",
        "description": "Quote block",
    }

    features.register_editor_plugin(
        "draftail", feature_name, draftail_features.BlockFeature(control)
    )

    features.register_converter_rule("contentstate", feature_name, {
        "from_database_format": {"blockquote": BlockElementHandler(feature_name)},
        "to_database_format": {
            "block_map": {
                feature_name: {"element": "blockquote"},
            }
        },
    })


@hooks.register("register_rich_text_features")
def configure_default_draftail(features):
    """
    Configure Draftail with all useful features enabled by default.
    """
    # Ensure all default features are available
    features.default_features = [
        "h2",
        "h3",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "link",
        "ul",
        "ol",
        "hr",
        "blockquote",
    ]
