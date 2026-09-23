from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, EventStatus, Registration
from app.schemas import (
    EventDetail,
    EventListResponse,
    EventSummary,
    RegistrationCreate,
    RegistrationResponse,
)

router = APIRouter(prefix="/public/events", tags=["public events"])

DatabaseSession = Annotated[Session, Depends(get_db)]

occupied_seats_expr = (
    select(func.count(Registration.id))
    .where(Registration.event_id == Event.id)
    .correlate(Event)
    .scalar_subquery()
)


def public_event_filters():
    return [
        Event.status == EventStatus.PUBLISHED,
        Event.starts_at > datetime.now(UTC),
    ]


def to_event_summary(event: Event, occupied_seats: int) -> EventSummary:
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
        available_seats=max(event.capacity - occupied_seats, 0),
    )


def count_registrations(db: Session, event_id: int) -> int:
    return (
        db.scalar(
            select(func.count(Registration.id)).where(Registration.event_id == event_id)
        )
        or 0
    )


@router.get("", response_model=EventListResponse)
def list_public_events(
    db: DatabaseSession,
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EventListResponse:
    filters = public_event_filters()

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

    rows = db.execute(
        select(Event, occupied_seats_expr)
        .where(*filters)
        .order_by(Event.starts_at.asc())
        .limit(limit)
        .offset(offset)
    ).all()
    total = db.scalar(select(func.count(Event.id)).where(*filters)) or 0

    return EventListResponse(
        items=[to_event_summary(event, occupied or 0) for event, occupied in rows],
        total=total,
    )


@router.get("/{slug}", response_model=EventDetail)
def get_public_event(slug: str, db: DatabaseSession) -> EventDetail:
    row = db.execute(
        select(Event, occupied_seats_expr).where(
            Event.slug == slug,
            *public_event_filters(),
        )
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Захід не знайдено.",
        )

    event, occupied = row
    summary = to_event_summary(event, occupied or 0)
    return EventDetail(**summary.model_dump(), description=event.description)


@router.post(
    "/{slug}/registrations/",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(
    slug: str,
    payload: RegistrationCreate,
    db: DatabaseSession,
) -> RegistrationResponse:
    event = db.scalar(select(Event).where(Event.slug == slug).with_for_update())
    if event is None or event.status != EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Захід не знайдено.",
        )

    starts_at = event.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=UTC)
    if starts_at <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Реєстрація на цей захід уже закрита.",
        )

    occupied_seats = count_registrations(db, event.id)
    if occupied_seats >= event.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Вільних місць більше немає.",
        )

    registration = Registration(
        event_id=event.id,
        full_name=payload.full_name,
        email=payload.email,
    )
    db.add(registration)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Цей email уже зареєстровано на захід.",
        ) from None

    db.refresh(registration)
    return RegistrationResponse(
        ticket_token=registration.ticket_token,
        full_name=registration.full_name,
        email=registration.email,
        event_title=event.title,
        event_slug=event.slug,
    )
