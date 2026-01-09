from django import forms
from .models import Booking
import phonenumbers
from django.core.exceptions import ValidationError

class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ['check_in', 'check_out', 'name', 'phone', 'telegram', 'guest_num']
        widgets = {
            'check_in': forms.DateInput(attrs={'type': 'date', 'class': 'input', 'placeholder': 'Выберите дату'}),
            'check_out': forms.DateInput(attrs={'type': 'date', 'class': 'input', 'placeholder': 'Выберите дату'}),
            'name': forms.TextInput(attrs={'class': 'input', 'placeholder': 'Ваше имя'}),
            'phone': forms.TextInput(attrs={'class': 'input', 'placeholder': '+7...', 'id': 'phone'}),
            'telegram': forms.TextInput(attrs={'class': 'input', 'placeholder': '@username'}),
            'guest_num': forms.Select(choices=[(i, str(i)) for i in range(1, 9)], attrs={'class': 'input'}),
        }

    def clean_phone(self):
        phone = self.cleaned_data['phone']
        try:
            # Парсим номер (предполагаем RU, если не указан код страны)
            p = phonenumbers.parse(phone, "RU")
            if not phonenumbers.is_valid_number(p):
                raise ValidationError("Некорректный номер телефона")
            # Возвращаем в стандартном формате E.164
            return phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise ValidationError("Некорректный формат номера")

    def clean(self):
        cleaned_data = super().clean()
        check_in = cleaned_data.get("check_in")
        check_out = cleaned_data.get("check_out")

        if check_in and check_out:
            if check_out <= check_in:
                raise ValidationError("Дата выезда должна быть позже даты заезда.")
        
        return cleaned_data