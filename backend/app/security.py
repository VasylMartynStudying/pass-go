from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

password_hasher = PasswordHash.recommended()

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def create_token(subject: str, token_type: TokenType, expires_delta: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_access_token(subject: str) -> str:
    settings = get_settings()
    return create_token(
        subject,
        TokenType.ACCESS,
        timedelta(minutes=settings.access_token_minutes),
    )


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    return create_token(
        subject,
        TokenType.REFRESH,
        timedelta(days=settings.refresh_token_days),
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as error:
        raise ValueError("Недійсний токен.") from error

    if payload.get("type") != expected_type.value or not payload.get("sub"):
        raise ValueError("Недійсний токен.")
    return payload
