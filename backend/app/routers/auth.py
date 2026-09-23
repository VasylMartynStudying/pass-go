from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import CurrentOrganizer
from app.models import Organizer
from app.schemas import LoginRequest, OrganizerMe, TokenResponse
from app.security import (
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
DatabaseSession = Annotated[Session, Depends(get_db)]


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.environment == "production",
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


def issue_access_response(organizer: Organizer, response: Response) -> TokenResponse:
    settings = get_settings()
    set_refresh_cookie(response, create_refresh_token(str(organizer.id)))
    return TokenResponse(
        access_token=create_access_token(str(organizer.id)),
        expires_in=settings.access_token_minutes * 60,
    )


@router.post("/login/", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: DatabaseSession,
) -> TokenResponse:
    organizer = db.scalar(select(Organizer).where(Organizer.email == payload.email))
    if (
        organizer is None
        or not organizer.is_active
        or not verify_password(payload.password, organizer.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірний email або пароль.",
        )
    return issue_access_response(organizer, response)


@router.post("/refresh/", response_model=TokenResponse)
def refresh_access_token(
    response: Response,
    db: DatabaseSession,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> TokenResponse:
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Немає refresh-токена.",
        )

    try:
        payload = decode_token(refresh_token, TokenType.REFRESH)
    except ValueError:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недійсний або прострочений refresh-токен.",
        ) from None

    organizer = db.scalar(select(Organizer).where(Organizer.id == int(payload["sub"])))
    if organizer is None or not organizer.is_active:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Обліковий запис організатора недоступний.",
        )
    return issue_access_response(organizer, response)


@router.post("/logout/", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    clear_refresh_cookie(response)


@router.get("/me/", response_model=OrganizerMe)
def read_current_organizer(organizer: CurrentOrganizer) -> OrganizerMe:
    return OrganizerMe(
        id=organizer.id,
        email=organizer.email,
        full_name=organizer.full_name,
        is_admin=organizer.is_admin,
    )
