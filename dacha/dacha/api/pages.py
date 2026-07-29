"""
Pages API — resolves slug to Wagtail page for Next.js catch-all route.
"""
from ninja import Router
from wagtail.api.v2.views import PagesAPIViewSet
from wagtail.api.v2.utils import get_object_detail_url

router = Router(tags=["pages"])


@router.get("/resolve/")
def resolve_page(request, html_path: str):
    """
    Resolve a URL path (e.g. /news/my-slug/) to a Wagtail page and return
    its API detail URL. Next.js uses this to fetch the correct page content.

    Equivalent to /api/v2/pages/find/?html_path=... but with a shorter path.
    """
    from wagtail.api.v2.utils import get_page_url
    from wagtail.models import Site

    site = Site.find_for_request(request)
    if site is None:
        return {"error": "No site configured"}, 404

    # Strip trailing/leading slashes consistently
    path = html_path.strip("/")

    # Use Wagtail's built-in page finding
    from wagtail.models import Page
    page, _, _ = Page.from_path(site.root_page, path)

    if page is None:
        return {"error": "Page not found"}, 404

    # Return the page's API detail URL (points to /api/v2/pages/{id}/)
    detail_url = get_object_detail_url(PagesAPIViewSet, page)
    return {
        "id": page.id,
        "type": page.specific_class.__name__,
        "url": detail_url,
    }
