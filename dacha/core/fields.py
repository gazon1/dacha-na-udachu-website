"""
Shared form fields used across apps.
Kept in core to avoid circular imports and ensure consistency.
"""
import phonenumbers
from django import forms
from django.core.exceptions import ValidationError


class PhoneNumberField(forms.CharField):
    """
    Unified phone number field using phonenumbers library.

    Validates and normalizes phone numbers to E.164 format.
    Used consistently across booking and events apps.
    """

    def __init__(self, region: str = "RU", **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("label", "Телефон")
        kwargs.setdefault("help_text", "Номер в любом формате, например: +7 999 123-45-67")
        super().__init__(**kwargs)
        self.region = region

    def clean(self, value):
        value = super().clean(value) or ""
        if not value.strip():
            if self.required:
                raise ValidationError("Укажите номер телефона")
            return value

        try:
            parsed = phonenumbers.parse(value, self.region)
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError("Некорректный номер телефона")
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise ValidationError("Некорректный формат номера")


class TelegramUsernameField(forms.CharField):
    """
    Validated Telegram username field.

    Telegram usernames are 5-32 characters, alphanumeric with underscores.
    The leading @ is stripped on clean.
    """

    USERNAME_RE = forms.RegexField(
        regex=r"^[a-zA-Z0-9_]{5,32}$",
        max_length=33,
        min_length=5,
    )

    def __init__(self, **kwargs):
        kwargs.setdefault("label", "Telegram")
        kwargs.setdefault("required", False)
        kwargs.setdefault("help_text", "Telegram-username без @")
        super().__init__(**kwargs)

    def clean(self, value):
        value = super().clean(value) or ""
        value = value.strip().lstrip("@")
        if not value:
            return value
        # Validate format via regex
        self.USERNAME_RE.clean(value)
        return value
