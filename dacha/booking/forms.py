from django import forms
from django.core.exceptions import ValidationError

from core.fields import PhoneNumberField
from .models import Booking


class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ["house", "check_in", "check_out", "name", "phone", "telegram", "guest_num"]
        widgets = {
            "house": forms.HiddenInput(),
            "check_in": forms.DateInput(attrs={"type": "date"}),
            "check_out": forms.DateInput(attrs={"type": "date"}),
        }
        labels = {
            "guest_num": "Гостей",
        }

    guest_num = forms.ChoiceField(
        choices=[(i, str(i)) for i in range(1, 9)],
        label="Гостей",
    )
    phone = PhoneNumberField()
    telegram = forms.CharField(max_length=100, required=False, label="Telegram")

    def clean(self):
        cleaned_data = super().clean()
        check_in = cleaned_data.get("check_in")
        check_out = cleaned_data.get("check_out")
        if check_in and check_out and check_out <= check_in:
            raise ValidationError("Дата выезда должна быть позже даты заезда.")
        return cleaned_data
