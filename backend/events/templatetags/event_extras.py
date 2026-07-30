from django import template

register = template.Library()


@register.filter
def filter_confirmed(passengers):
    """Return only confirmed passengers."""
    return [p for p in passengers if p.status == "confirmed"]
