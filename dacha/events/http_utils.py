"""
HTMX-aware HTTP response helpers.
Kept separate from views and models to preserve MVT separation —
forms and domain models must not know about HttpResponse.
"""
import json

from django.http import HttpResponse


def htmx_error(message: str, status: int = 400):
    """
    Return an HttpResponse with an HX-Trigger header that fires the toast system.
    Works with Alpine.store('toast') in app.js.
    """
    response = HttpResponse(message, status=status)
    response["HX-Trigger"] = json.dumps({
        "showToast": {"message": message, "type": "error"}
    })
    return response


def htmx_success(message: str):
    """HTMX success response with toast trigger."""
    response = HttpResponse(message)
    response["HX-Trigger"] = json.dumps({
        "showToast": {"message": message, "type": "success"}
    })
    return response
