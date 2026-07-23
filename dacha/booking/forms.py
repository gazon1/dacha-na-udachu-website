from django import forms
from .models import Booking
import phonenumbers
from django.core.exceptions import ValidationError


class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ["check_in", "check_out", "name", "phone", "telegram", "guest_num"]
        widgets = {
            "check_in": forms.DateInput(attrs={"type": "date", "class": "input"}),
            "check_out": forms.DateInput(attrs={"type": "date", "class": "input"}),
            "name": forms.TextInput(attrs={"class": "input"}),
            "phone": forms.TextInput(attrs={"class": "input", "id": "phone"}),
            "telegram": forms.TextInput(attrs={"class": "input"}),
            "guest_num": forms.Select(choices=[(i, str(i)) for i in range(1, 9)], attrs={"class": "input"}),
        }

    def clean_phone(self):
        phone = self.cleaned_data["phone"]
        try:
            p = phonenumbers.parse(phone, "RU")
            if not phonenumbers.is_valid_number(p):
                raise ValidationError("Некорректный номер телефона")
            return phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise ValidationError("Некорректный формат номера")

    def clean(self):
        cleaned_data = super().clean()
        check_in = cleaned_data.get("check_in")
        check_out = cleaned_data.get("check_out")
        if check_in and check_out and check_out <= check_in:
            raise ValidationError("Дата выезда должна быть позже даты заезда.")
        return cleaned_data
