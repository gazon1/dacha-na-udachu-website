"""
Preview API — fetches a draft page preview by content_type + token.
Used by Next.js for Wagtail's "Preview in frontend" button.
"""
from django.http import HttpRequest, JsonResponse
from ninja import Router

from wagtail_headless_preview.models import PagePreview

router = Router(tags=["preview"])


@router.get("/draft/")
def get_draft(request: HttpRequest, content_type: str, token: str) -> JsonResponse:
    """
    Fetch a draft page by its preview token.
    Next.js calls this on /preview/?content_type=...&token=...
    """
    PagePreview.garbage_collect()
    try:
        page_preview = PagePreview.objects.get(token=token)
    except PagePreview.DoesNotExist:
        return JsonResponse({"error": "Preview not found or expired"}, status=404)

    try:
        page = page_preview.as_page()
        return JsonResponse({
            "id": page.id,
            "title": page.title,
            "slug": page.slug if hasattr(page, "slug") else None,
            "type": page.specific_class.__name__,
            "url": f"/api/v2/pages/{page.id}/",
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
