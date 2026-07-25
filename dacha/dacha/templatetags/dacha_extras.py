"""
Dacha template tags and filters.
"""
from django import template

register = template.Library()


@register.filter
def stats_dict(obj):
    """
    Build a stats list from a HousePage or EventPage for use with _listing_card.

    Returns a list of dicts: [{"icon": "html", "value": "...", "unit": "..."}]

    Usage:
        {% include "includes/components/_listing_card.html" with card_stats=house|stats_dict %}
    """
    from houses.models import HousePage
    from events.models import EventPage

    stats = []

    if isinstance(obj, HousePage):
        if getattr(obj, "base_price", None):
            stats.append({
                "icon": '<span class="material-symbols-outlined text-brand-400 text-sm">payments</span>',
                "value": obj.base_price,
                "unit": "₽/сут",
            })
        if getattr(obj, "capacity", None):
            stats.append({
                "icon": '<span class="material-symbols-outlined text-brand-400 text-sm">group</span>',
                "value": obj.capacity,
                "unit": "гостей",
            })
        if getattr(obj, "bedrooms", None):
            stats.append({
                "icon": '<span class="material-symbols-outlined text-brand-400 text-sm">bed</span>',
                "value": obj.bedrooms,
                "unit": "спален",
            })

    elif isinstance(obj, EventPage):
        if getattr(obj, "start_date", None):
            stats.append({
                "icon": '<span class="material-symbols-outlined text-brand-400 text-sm">calendar_month</span>',
                "value": obj.start_date.strftime("%d %b"),
                "unit": "",
            })
        if getattr(obj, "venue", None):
            stats.append({
                "icon": '<span class="material-symbols-outlined text-brand-400 text-sm">location_on</span>',
                "value": obj.venue[:30],
                "unit": "",
            })

    return stats
