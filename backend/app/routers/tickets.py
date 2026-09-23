from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Registration
from app.schemas import TicketResponse

router = APIRouter(prefix="/public/tickets", tags=["public tickets"])

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("/{ticket_token}/", response_model=TicketResponse)
def get_ticket(ticket_token: str, db: DatabaseSession) -> TicketResponse:
    registration = db.scalar(
        select(Registration)
        .options(joinedload(Registration.event))
        .where(Registration.ticket_token == ticket_token)
    )
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Квиток не знайдено.",
        )

    starts_at = registration.event.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=UTC)

    return TicketResponse(
        ticket_token=registration.ticket_token,
        full_name=registration.full_name,
        event_title=registration.event.title,
        event_slug=registration.event.slug,
        starts_at=starts_at,
        location=registration.event.location,
    )
