"""
HTTP response helpers for HTMX-compatible responses.
Still used by legacy event view functions (events/views.py).
HTMX-specific headers (HX-Redirect, HX-Trigger) are set here so that
event views continue to work without modification.
"""
import json

from django.http import HttpResponse, HttpResponseRedirect


def is_htmx(request) -> bool:
    """Check if request was made via HTMX."""
    return getattr(request, "htmx", False) is not False


def htmx_redirect(url: str):
    """
    Return a redirect response that works correctly with HTMX.

    Sets HX-Redirect so HTMX replaces the full page instead of doing
    a client-side redirect.
    """
    response = HttpResponseRedirect(url)
    response["HX-Redirect"] = url
    return response


def htmx_trigger(trigger_name: str, data: dict) -> str:
    """
    Build a JSON string for the HX-Trigger header.

    Works with Alpine.store('toast') in app.js.
    """
    return json.dumps({trigger_name: data})


def htmx_toast(message: str, toast_type: str = "success") -> dict:
    """
    Build toast trigger data for the frontend toast system.

    Frontend (Alpine.js) listens for 'showToast' and renders
    a toast notification of the given type.
    """
    return {"message": message, "type": toast_type}


def htmx_error(message: str, status: int = 400):
    """
    Return an HttpResponse with an HX-Trigger header that fires the toast system.

    Usage in views:
        return htmx_error("Something went wrong")
    """
    response = HttpResponse(message, status=status)
    response["HX-Trigger"] = htmx_trigger("showToast", htmx_toast(message, "error"))
    return response


def htmx_success(message: str):
    """
    HTMX success response with toast trigger.

    Usage in views:
        return htmx_success("Action completed")
    """
    response = HttpResponse(message)
    response["HX-Trigger"] = htmx_trigger("showToast", htmx_toast(message, "success"))
    return response


def htmx_error_from_messages(request, message: str, status: int = 400):
    """
    Add error message via Django messages framework and return HTMX response.

    Requires django.contrib.messages middleware and django-htmx middleware.
    """
    from django.contrib import messages
    messages.error(request, message)
    return htmx_error(message, status)


def htmx_success_from_messages(request, message: str):
    """
    Add success message via Django messages framework and return HTMX response.

    Requires django.contrib.messages middleware and django-htmx middleware.
    """
    from django.contrib import messages
    messages.success(request, message)
    return htmx_success(message)
