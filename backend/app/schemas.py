from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
