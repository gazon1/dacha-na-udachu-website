"""
Pydantic schemas for the dacha.api package.
Mirrors Django forms and model fields — validation rules stay in sync.
"""
import re
from datetime import date, datetime
from typing import Annotated

from ninja import Field, Schema
from pydantic import BaseModel, ConfigDict, field_validator


# ─── Shared validators ────────────────────────────────────────────────────────

E164_RE = re.compile(r"^\+\d{7,15}$")
TELEGRAM_RE = re.compile(r"^[a-zA-Z0-9_]{5,32}$")


def phone_validator(value: str) -> str:
    """Normalize to E.164 — mirrors core.fields.PhoneNumberField."""
    if not value:
        return value
    value = value.strip()
    # Allow leading + and digits only
    cleaned = re.sub(r"[^\d+]", "", value)
    if not E164_RE.match(cleaned):
        raise ValueError("Некорректный номер телефона")
    return cleaned


def telegram_validator(value: str | None) -> str:
    """Strip @ and validate format — mirrors core.fields.TelegramUsernameField."""
    if not value:
        return ""
    value = value.strip().lstrip("@")
    if value and not TELEGRAM_RE.match(value):
        raise ValueError("Telegram-username: 5-32 символа, буквы, цифры, _")
    return value


# ─── Booking schemas ─────────────────────────────────────────────────────────

class BookingSubmitIn(Schema):
    house_id: int
    check_in: date
    check_out: date
    name: Annotated[str, Field(max_length=255)]
    phone: str
    telegram: str | None = ""
    guest_num: Annotated[int, Field(ge=1, le=8)] = 1

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return phone_validator(v)

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("Дата выезда должна быть позже даты заезда")
        return v


class BookingSubmitOut(BaseModel):
    id: int
    name: str
    status: str  # "pending" or "confirmed"


class BookingQuoteIn(Schema):
    house_id: int
    check_in: date
    check_out: date
    banya: bool = False
    manhal: bool = False
    fishing: bool = False


class BookingQuoteOut(BaseModel):
    nights: int
    price_per_night: float
    extras: dict[str, float]
    extras_total: float
    subtotal: float
    total: float


class HouseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    capacity: int
    bedrooms: int
    address: str
    base_price: float
    booking_enabled: bool
    hero_image_url: str | None = None


class DateRangeOut(BaseModel):
    start: str
    end: str


class AvailabilityOut(BaseModel):
    available: bool
    booked_dates: list[DateRangeOut] = []


# ─── Event schemas ────────────────────────────────────────────────────────────

class RSVPSubmitIn(Schema):
    name: Annotated[str, Field(max_length=100)]
    status: Annotated[str, Field(pattern=r"^(going|maybe|not_going)$")] = "going"
    guests_count: Annotated[int, Field(ge=0)] = 0
    secret_key: str = ""  # Required when updating another user's RSVP


class RSVPOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    guests_count: int


class RSVPMEOut(BaseModel):
    voted: bool
    id: int | None = None
    name: str | None = None
    status: str | None = None
    secret_key: str | None = None  # Only set on claim endpoint


class RSVPClaimIn(Schema):
    secret_key: str


class DriverIn(Schema):
    name: Annotated[str, Field(max_length=100)]
    phone: str
    telegram: str | None = ""
    car_model: str = ""
    car_type: str = ""
    seats_total: Annotated[int, Field(ge=1, le=20)] = 4
    departure_date: date | None = None
    departure_time: str | None = None
    departure_location: Annotated[str, Field(max_length=200)] = ""
    return_date: date | None = None
    return_time: str | None = None
    notes: str = ""
    contact_preference: Annotated[str, Field(pattern=r"^(telegram|phone|both)$")] = "telegram"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return phone_validator(v)

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    telegram: str | None
    phone: str | None
    car_model: str
    car_type: str
    seats_total: int
    seats_taken: int
    seats_available: int
    departure_date: date | None
    departure_time: str | None
    departure_location: str
    return_date: date | None
    return_time: str | None
    notes: str
    contact_preference: str
    is_cancelled: bool
    is_verified: bool
    cancel_token: str
    created_at: datetime


class PassengerIn(Schema):
    name: Annotated[str, Field(max_length=100)]
    phone: str
    telegram: str | None = ""
    pickup_location: Annotated[str, Field(max_length=200)] = ""
    seats: Annotated[int, Field(ge=1, le=20)] = 1
    notes: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return phone_validator(v)

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)


class PassengerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    telegram: str | None
    phone: str | None
    pickup_location: str
    seats: int
    notes: str
    status: str
    created_at: datetime


class CarpoolRequestIn(Schema):
    name: Annotated[str, Field(max_length=100)]
    phone: str
    telegram: str | None = ""
    pickup_location: Annotated[str, Field(max_length=200)] = ""
    seats_needed: Annotated[int, Field(ge=1, le=20)] = 1
    can_share_gas: bool = False
    flexible_time: bool = False
    notes: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return phone_validator(v)

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)


class CarpoolRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    telegram: str | None
    phone: str | None
    pickup_location: str
    seats_needed: int
    can_share_gas: bool
    flexible_time: bool
    notes: str
    is_active: bool
    created_at: datetime


class TaxiPoolIn(Schema):
    organizer: Annotated[str, Field(max_length=100)]
    telegram: str | None = ""
    pickup_location: Annotated[str, Field(max_length=200)]
    departure_date: date
    departure_time: str
    max_passengers: Annotated[int, Field(ge=1, le=20)] = 4
    estimated_price: int = 0
    service: Annotated[str, Field(pattern=r"^(yandex|citymobil|other)$")] = "yandex"
    notes: str = ""

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)


class TaxiPoolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizer: str
    telegram: str | None
    pickup_location: str
    departure_date: date
    departure_time: str
    max_passengers: int
    passengers_count: int
    spots_left: int
    estimated_price: int
    service: str
    notes: str
    is_active: bool
    created_at: datetime


class TaxiPassengerIn(Schema):
    name: Annotated[str, Field(max_length=100)]
    phone: str
    telegram: str | None = ""
    seats: Annotated[int, Field(ge=1, le=20)] = 1
    notes: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return phone_validator(v)

    @field_validator("telegram")
    @classmethod
    def validate_telegram(cls, v: str | None) -> str:
        return telegram_validator(v)


class TaxiPassengerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    telegram: str | None
    phone: str | None
    seats: int
    notes: str
    is_active: bool
    created_at: datetime


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    start_date: date
    end_date: date | None
    start_time: str | None
    venue: str
    venue_notes: str
    map_link: str
    summary: str
    show_countdown: bool
    expected_temperature: str
    weather_note: str
    special_tag: str
    rsvp_capacity: int | None
    going_count: int
    maybe_count: int
    total_attending: int
    url: str | None


class AttendeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    status: str
    guests_count: int


class CarpoolSectionOut(BaseModel):
    drivers: list[DriverOut]
    carpool_requests: list[CarpoolRequestOut]
    taxi_pools: list[TaxiPoolOut]


# ─── Newsletter schema ───────────────────────────────────────────────────────

class NewsletterIn(Schema):
    email: Annotated[str, Field(max_length=254)]


class NewsletterOut(BaseModel):
    message: str
