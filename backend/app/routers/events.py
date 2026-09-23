from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, EventStatus
from app.schemas import EventDetail, EventListResponse, EventSummary

router = APIRouter(prefix="/public/events", tags=["public events"])

DatabaseSession = Annotated[Session, Depends(get_db)]


def to_event_summary(event: Event) -> EventSummary:
    occupied_seats = 0
    starts_at = event.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=UTC)

    return EventSummary(
        slug=event.slug,
        title=event.title,
        starts_at=starts_at,
        location=event.location,
        capacity=event.capacity,
        occupied_seats=occupied_seats,
        available_seats=event.capacity - occupied_seats,
    )


@router.get("", response_model=EventListResponse)
def list_public_events(
    db: DatabaseSession,
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EventListResponse:
    filters = [
        Event.status == EventStatus.PUBLISHED,
        Event.starts_at > datetime.now(UTC),
    ]

    if search_term := search and search.strip():
        normalized_search = search_term.casefold()
        filters.append(
            or_(
                func.casefold(Event.title).contains(normalized_search, autoescape=True),
                func.casefold(Event.description).contains(
                    normalized_search, autoescape=True
                ),
                func.casefold(Event.location).contains(
                    normalized_search, autoescape=True
                ),
            )
        )

    events = db.scalars(
        select(Event)
        .where(*filters)
        .order_by(Event.starts_at.asc())
        .limit(limit)
        .offset(offset)
    ).all()
    total = db.scalar(select(func.count(Event.id)).where(*filters)) or 0

    return EventListResponse(
        items=[to_event_summary(event) for event in events],
        total=total,
    )


@router.get("/{slug}", response_model=EventDetail)
def get_public_event(slug: str, db: DatabaseSession) -> EventDetail:
    event = db.scalar(
        select(Event).where(
            Event.slug == slug,
            Event.status == EventStatus.PUBLISHED,
            Event.starts_at > datetime.now(UTC),
        )
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Захід не знайдено.",
        )

    summary = to_event_summary(event)
    return EventDetail(**summary.model_dump(), description=event.description)
