from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Organizer
from app.security import TokenType, decode_token

bearer_scheme = HTTPBearer(auto_error=False)
DatabaseSession = Annotated[Session, Depends(get_db)]


def get_current_organizer(
    db: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Organizer:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Потрібна авторизація організатора.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials, TokenType.ACCESS)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недійсний або прострочений токен.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    organizer = db.scalar(select(Organizer).where(Organizer.id == int(payload["sub"])))
    if organizer is None or not organizer.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Обліковий запис організатора недоступний.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return organizer


CurrentOrganizer = Annotated[Organizer, Depends(get_current_organizer)]
