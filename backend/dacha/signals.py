"""
On-demand cache revalidation webhook for the Next.js frontend.

Connects to Wagtail page lifecycle signals and POSTs to
FRONTEND_REVALIDATE_URL with the page's path/tag/id so the Next.js
/app/api/revalidate Route Handler can call revalidatePath / revalidateTag.

Defensive: all errors are swallowed + logged. A failure must NEVER break
the Wagtail publish flow — the editor's "Publish" button is sacred.
"""
import logging
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from wagtail.signals import (
    page_published,
    page_unpublished,
    post_page_move,
)

logger = logging.getLogger(__name__)


def _revalidate(payload: dict) -> None:
    """POST a revalidation request to the Next.js frontend.

    No-op if FRONTEND_REVALIDATE_URL or FRONTEND_REVALIDATE_SECRET is unset
    (useful in dev where the frontend may be down). All network errors are
    caught and logged — never propagated, so Wagtail publishing cannot fail
    because the frontend cache layer is unreachable.
    """
    url = getattr(settings, "FRONTEND_REVALIDATE_URL", "")
    secret = getattr(settings, "FRONTEND_REVALIDATE_SECRET", "")
    if not url or not secret:
        return  # not configured — no-op

    timeout = getattr(settings, "FRONTEND_REVALIDATE_TIMEOUT", 2.0)

    # Drop None values so empty params don't pollute the URL.
    qs = urlencode({k: v for k, v in payload.items() if v is not None})
    full_url = f"{url.rstrip('/')}/api/revalidate"
    if qs:
        full_url = f"{full_url}?{qs}"

    try:
        requests.post(
            full_url,
            headers={"X-Revalidate-Secret": secret},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        # Swallow + log. Publishing must not fail because the frontend is down.
        logger.warning("revalidate webhook failed for %s: %s", full_url, exc)


@receiver(page_published, dispatch_uid="dacha_revalidate_on_publish")
def _on_published(sender, instance, **kwargs):
    if not instance.live:
        return
    _revalidate({
        "path": instance.url,
        "tag": f"wagtail:page:{instance.id}",
        "id": instance.id,
    })


@receiver(page_unpublished, dispatch_uid="dacha_revalidate_on_unpublish")
def _on_unpublished(sender, instance, **kwargs):
    _revalidate({
        "path": instance.url,
        "tag": f"wagtail:page:{instance.id}",
        "id": instance.id,
    })


@receiver(post_page_move, dispatch_uid="dacha_revalidate_on_move")
def _on_move(sender, instance, url_path_before, url_path_after, **kwargs):
    # Old path may now 404; new path should re-render.
    if url_path_before and url_path_before != url_path_after:
        _revalidate({"path": url_path_before, "tag": "wagtail:site"})
    _revalidate({
        "path": instance.url,
        "tag": f"wagtail:page:{instance.id}",
        "id": instance.id,
    })


def _on_page_delete(sender, instance, **kwargs):
    """Bound to wagtail.models.Page below — Wagtail 7 has no page_deleted signal."""
    _revalidate({
        "path": instance.url,
        "tag": f"wagtail:page:{instance.id}",
        "id": instance.id,
    })


# Bind the post_delete handler to the Wagtail Page model.
# Done at import time so the wiring is in exactly one place.
from wagtail.models import Page as _Page  # noqa: E402
post_delete.connect(_on_page_delete, sender=_Page, dispatch_uid="dacha_revalidate_on_delete")