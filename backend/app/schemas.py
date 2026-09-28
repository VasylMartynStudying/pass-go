from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import EventStatus


class EventSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    starts_at: datetime
    location: str
    capacity: int
    occupied_seats: int
    available_seats: int


class EventDetail(EventSummary):
    description: str


class EventListResponse(BaseModel):
    items: list[EventSummary]
    total: int


class RegistrationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        name = " ".join(value.split())
        if len(name) < 2:
            raise ValueError("Вкажіть ім’я та прізвище.")
        return name

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        local, _, domain = email.partition("@")
        if not local or "." not in domain:
            raise ValueError("Вкажіть коректний email.")
        return email


class RegistrationResponse(BaseModel):
    ticket_token: str
    full_name: str
    email: str
    event_title: str
    event_slug: str


class TicketResponse(BaseModel):
    ticket_token: str
    full_name: str
    event_title: str
    event_slug: str
    starts_at: datetime
    location: str


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_login_email(cls, value: str) -> str:
        return value.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class OrganizerMe(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool


class OrganizerEventWrite(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10, max_length=5000)
    starts_at: datetime
    location: str = Field(min_length=2, max_length=255)
    capacity: int = Field(ge=1, le=100_000)
    status: EventStatus = EventStatus.DRAFT

    @field_validator("title", "location")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class OrganizerEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    description: str
    starts_at: datetime
    location: str
    capacity: int
    status: EventStatus
    occupied_seats: int
    available_seats: int


class OrganizerEventListResponse(BaseModel):
    items: list[OrganizerEvent]
    total: int


class Attendee(BaseModel):
    full_name: str
    email: str
    registered_at: datetime
    checked_in_at: datetime | None
    is_checked_in: bool


class EventDashboardResponse(BaseModel):
    event: OrganizerEvent
    checked_in_count: int
    attendees: list[Attendee]
    attendees_total: int
    limit: int
    offset: int


class CheckInRequest(BaseModel):
    ticket_token: str = Field(min_length=1, max_length=2000)

    @field_validator("ticket_token")
    @classmethod
    def normalize_ticket_token(cls, value: str) -> str:
        return value.strip()


class CheckInResponse(BaseModel):
    full_name: str
    event_title: str
    event_slug: str
    checked_in_at: datetime
