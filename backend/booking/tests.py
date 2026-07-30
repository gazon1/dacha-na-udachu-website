from datetime import date
from django.test import TestCase
from .forms import BookingForm
from .services import calculate_nights, calculate_total
from .availability import is_available


class BookingFormTest(TestCase):
    def test_clean_phone_valid(self):
        """Valid Russian phone number should be normalized to E.164."""
        form = BookingForm(data={
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
            "name": "Ivan",
            "phone": "+7 999 123-45-67",
            "telegram": "",
            "guest_num": 2,
        })
        self.assertTrue(form.is_valid(), form.errors)

    def test_clean_phone_invalid(self):
        """Invalid phone number should raise error."""
        form = BookingForm(data={
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
            "name": "Ivan",
            "phone": "not-a-phone",
            "telegram": "",
            "guest_num": 2,
        })
        self.assertFalse(form.is_valid())
        self.assertIn("phone", form.errors)

    def test_clean_checkout_after_checkin(self):
        """Checkout must be after checkin."""
        form = BookingForm(data={
            "check_in": "2026-08-05",
            "check_out": "2026-08-01",
            "name": "Ivan",
            "phone": "+79991234567",
            "telegram": "",
            "guest_num": 2,
        })
        self.assertFalse(form.is_valid())
        self.assertIn("__all__", form.errors)


class BookingServiceTest(TestCase):
    def test_calculate_nights(self):
        """Calculate nights between two dates."""
        self.assertEqual(calculate_nights(date(2026, 8, 1), date(2026, 8, 5)), 4)

    def test_calculate_total(self):
        """Calculate total price for booking."""
        total = calculate_total("5000", date(2026, 8, 1), date(2026, 8, 5))
        self.assertEqual(total, 20000)  # 4 nights * 5000

    def test_calculate_total_with_extras(self):
        """Calculate total with extras."""
        total = calculate_total(
            "5000",
            date(2026, 8, 1),
            date(2026, 8, 5),
            {"banya": True, "manhal": False},
        )
        # 4 nights * 5000 + 500 (banya) = 20500
        self.assertEqual(total, 20500)

    def test_calculate_total_same_day(self):
        """Same day checkin/checkout returns 0."""
        total = calculate_total("5000", date(2026, 8, 1), date(2026, 8, 1))
        self.assertEqual(total, 0)
