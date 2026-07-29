"""
Pages API — resolves slug to Wagtail page for Next.js catch-all route.
"""
from django.http import HttpRequest
from ninja import Router

router = Router(tags=["pages"])


def _get_page_api_url(page) -> str:
    """Return the API detail URL for a page, e.g. /api/v2/pages/1/."""
    return f"/api/v2/pages/{page.id}/"


@router.get("/resolve/")
def resolve_page(request: HttpRequest, html_path: str):
    """
    Resolve a URL path (e.g. /news/my-slug/) to a Wagtail page and return
    its API detail URL. Next.js uses this to fetch the correct page content.

    Equivalent to /api/v2/pages/find/?html_path=... but with a shorter path.
    """
    from wagtail.models import Site

    site = Site.find_for_request(request)
    if site is None:
        return {"error": "No site configured"}, 404

    path = html_path.strip("/")

    from wagtail.models import Page

    try:
        page, _, _ = Page.from_path(site.root_page, path)
    except Exception:
        return {"error": "Page not found"}, 404

    if page is None:
        return {"error": "Page not found"}, 404

    return {
        "id": page.id,
        "type": page.specific_class.__name__,
        "url": _get_page_api_url(page),
    }
