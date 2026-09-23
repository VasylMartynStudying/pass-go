from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
