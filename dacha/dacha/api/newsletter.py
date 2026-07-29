"""
Newsletter API endpoint — POST subscribe.
"""
import re

from django.http import HttpRequest
from ninja import Router

from .schemas import NewsletterIn, NewsletterOut

router = Router(tags=["newsletter"])


EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


@router.post("/", response=NewsletterOut)
def subscribe_newsletter(request: HttpRequest, data: NewsletterIn):
    """Subscribe an email to the newsletter. GDPR-compliant."""
    from core.models import NewsletterSignup

    email = data.email.strip()
    if not EMAIL_RE.match(email):
        return NewsletterOut(message="Некорректный email")

    signup, created = NewsletterSignup.objects.get_or_create(
        email=email,
        defaults={"ip_address": request.META.get("REMOTE_ADDR", "")},
    )
    if not created:
        signup.is_active = True
        signup.save(update_fields=["is_active"])

    return NewsletterOut(message="Подписка оформлена!")
