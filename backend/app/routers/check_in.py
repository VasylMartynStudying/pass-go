from datetime import UTC, datetime
from typing import Annotated
from urllib.parse import unquote, urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import CurrentOrganizer
from app.models import Event, Registration
from app.schemas import CheckInRequest, CheckInResponse

router = APIRouter(prefix="/organizer/check-in", tags=["organizer check-in"])
DatabaseSession = Annotated[Session, Depends(get_db)]


def parse_ticket_token(raw: str) -> str | None:
    text = raw.strip()
    if not text:
        return None

    parsed = urlparse(text)
    path = parsed.path if parsed.scheme and parsed.netloc else text
    parts = [unquote(part) for part in path.split("/") if part]
    if len(parts) >= 2 and parts[-2] == "tickets":
        text = parts[-1]

    try:
        return str(UUID(text))
    except ValueError:
        return None


def aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def to_check_in_response(registration: Registration) -> CheckInResponse:
    return CheckInResponse(
        full_name=registration.full_name,
        event_title=registration.event.title,
        event_slug=registration.event.slug,
        checked_in_at=aware(registration.checked_in_at or datetime.now(UTC)),
    )


@router.post("/", response_model=CheckInResponse)
def check_in_attendee(
    payload: CheckInRequest,
    organizer: CurrentOrganizer,
    db: DatabaseSession,
) -> CheckInResponse:
    token = parse_ticket_token(payload.ticket_token)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Квиток не знайдено.",
        )

    now = datetime.now(UTC)
    result = db.execute(
        update(Registration)
        .where(
            Registration.ticket_token == token,
            Registration.checked_in_at.is_(None),
            Registration.event_id.in_(
                select(Event.id).where(Event.owner_id == organizer.id)
            ),
        )
        .values(checked_in_at=now, updated_at=now)
    )
    if result.rowcount == 1:
        db.commit()
        registration = db.scalar(
            select(Registration)
            .options(joinedload(Registration.event))
            .where(Registration.ticket_token == token)
        )
        assert registration is not None
        return to_check_in_response(registration)

    registration = db.scalar(
        select(Registration)
        .options(joinedload(Registration.event))
        .where(Registration.ticket_token == token)
    )
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Квиток не знайдено.",
        )
    if registration.event.owner_id != organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Цей квиток належить чужому заходу.",
        )
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Квиток уже використано ({registration.full_name}).",
    )
