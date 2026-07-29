from django import forms

from core.fields import PhoneNumberField, TelegramUsernameField
from .models import EventRSVP, EventDriver, RidePassenger, CarpoolRequest, TaxiPool, TaxiPassenger


class RSVPForm(forms.ModelForm):
    class Meta:
        model = EventRSVP
        fields = ["name", "status", "guests_count"]

    name = forms.CharField(max_length=100)
    status = forms.ChoiceField(choices=EventRSVP.STATUS_CHOICES, required=False)
    guests_count = forms.IntegerField(min_value=0, required=False, initial=0)

    def clean_status(self):
        status = self.cleaned_data.get("status")
        if status not in dict(EventRSVP.STATUS_CHOICES):
            return EventRSVP.GOING
        return status


class DriverForm(forms.ModelForm):
    class Meta:
        model = EventDriver
        fields = [
            "name", "telegram", "phone", "car_model", "car_type",
            "seats_total", "departure_date", "departure_time",
            "departure_location", "return_date", "return_time",
            "notes", "contact_preference",
        ]

    name = forms.CharField(max_length=100)
    phone = PhoneNumberField()
    telegram = TelegramUsernameField()
    departure_location = forms.CharField(max_length=200)
    departure_date = forms.DateField(required=False)
    departure_time = forms.TimeField(required=False)
    return_date = forms.DateField(required=False)
    return_time = forms.TimeField(required=False)
    seats_total = forms.IntegerField(min_value=1, max_value=20, initial=4)


class PassengerForm(forms.ModelForm):
    class Meta:
        model = RidePassenger
        fields = ["name", "telegram", "phone", "pickup_location", "seats", "notes"]

    name = forms.CharField(max_length=100)
    phone = PhoneNumberField()
    telegram = TelegramUsernameField()
    pickup_location = forms.CharField(max_length=200, required=False)
    seats = forms.IntegerField(min_value=1, initial=1)


class CarpoolRequestForm(forms.ModelForm):
    class Meta:
        model = CarpoolRequest
        fields = [
            "name", "telegram", "phone", "pickup_location",
            "seats_needed", "can_share_gas", "flexible_time", "notes",
        ]

    name = forms.CharField(max_length=100)
    phone = PhoneNumberField()
    telegram = TelegramUsernameField()
    pickup_location = forms.CharField(max_length=200)
    seats_needed = forms.IntegerField(min_value=1, initial=1)
    can_share_gas = forms.BooleanField(required=False)
    flexible_time = forms.BooleanField(required=False)


class TaxiPoolForm(forms.ModelForm):
    class Meta:
        model = TaxiPool
        fields = [
            "organizer", "telegram", "pickup_location",
            "departure_date", "departure_time", "max_passengers",
            "estimated_price", "service", "notes",
        ]

    organizer = forms.CharField(max_length=100)
    telegram = TelegramUsernameField()
    pickup_location = forms.CharField(max_length=200)
    departure_date = forms.DateField()
    departure_time = forms.TimeField()
    max_passengers = forms.IntegerField(min_value=1, max_value=20, initial=4)
    estimated_price = forms.IntegerField(min_value=0, required=False, initial=0)


class TaxiPassengerForm(forms.ModelForm):
    class Meta:
        model = TaxiPassenger
        fields = ["name", "telegram", "phone", "seats", "notes"]

    name = forms.CharField(max_length=100)
    phone = PhoneNumberField()
    telegram = TelegramUsernameField()
    seats = forms.IntegerField(min_value=1, initial=1)
