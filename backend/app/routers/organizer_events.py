from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentOrganizer
from app.models import Event, EventStatus, Organizer, Registration
from app.schemas import (
    OrganizerEvent,
    OrganizerEventListResponse,
    OrganizerEventWrite,
)
from app.slug import unique_slug

router = APIRouter(prefix="/organizer/events", tags=["organizer events"])
DatabaseSession = Annotated[Session, Depends(get_db)]

occupied_seats_expr = (
    select(func.count(Registration.id))
    .where(Registration.event_id == Event.id)
    .correlate(Event)
    .scalar_subquery()
)


def aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def to_organizer_event(event: Event, occupied_seats: int) -> OrganizerEvent:
    starts_at = aware(event.starts_at)
    return OrganizerEvent(
        slug=event.slug,
        title=event.title,
        description=event.description,
        starts_at=starts_at,
        location=event.location,
        capacity=event.capacity,
        status=event.status,
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


def validate_schedule(starts_at: datetime, event_status: EventStatus) -> datetime:
    starts_at = aware(starts_at)
    if event_status == EventStatus.PUBLISHED and starts_at <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Опублікований захід має починатися в майбутньому.",
        )
    return starts_at


def get_owned_event(db: Session, organizer: Organizer, slug: str) -> Event:
    event = db.scalar(
        select(Event).where(Event.slug == slug, Event.owner_id == organizer.id)
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Захід не знайдено.",
        )
    return event


@router.get("/", response_model=OrganizerEventListResponse)
def list_own_events(
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> OrganizerEventListResponse:
    rows = db.execute(
        select(Event, occupied_seats_expr)
        .where(Event.owner_id == organizer.id)
        .order_by(Event.starts_at.desc())
    ).all()
    return OrganizerEventListResponse(
        items=[to_organizer_event(event, occupied or 0) for event, occupied in rows],
        total=len(rows),
    )


@router.post("/", response_model=OrganizerEvent, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: OrganizerEventWrite,
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> OrganizerEvent:
    starts_at = validate_schedule(payload.starts_at, payload.status)
    event = Event(
        owner_id=organizer.id,
        title=payload.title,
        slug=unique_slug(db, payload.title),
        description=payload.description,
        starts_at=starts_at,
        location=payload.location,
        capacity=payload.capacity,
        status=payload.status,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return to_organizer_event(event, 0)


@router.get("/{slug}/", response_model=OrganizerEvent)
def get_own_event(
    slug: str,
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> OrganizerEvent:
    event = get_owned_event(db, organizer, slug)
    return to_organizer_event(event, count_registrations(db, event.id))


@router.put("/{slug}/", response_model=OrganizerEvent)
def update_event(
    slug: str,
    payload: OrganizerEventWrite,
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> OrganizerEvent:
    event = get_owned_event(db, organizer, slug)
    occupied = count_registrations(db, event.id)
    if payload.capacity < occupied:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Місткість не може бути меншою за кількість реєстрацій.",
        )

    event.title = payload.title
    event.description = payload.description
    event.starts_at = validate_schedule(payload.starts_at, payload.status)
    event.location = payload.location
    event.capacity = payload.capacity
    event.status = payload.status
    db.commit()
    db.refresh(event)
    return to_organizer_event(event, occupied)


@router.delete("/{slug}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    slug: str,
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> None:
    event = get_owned_event(db, organizer, slug)
    if count_registrations(db, event.id) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Неможливо видалити захід, на який уже є реєстрації.",
        )
    db.delete(event)
    db.commit()
