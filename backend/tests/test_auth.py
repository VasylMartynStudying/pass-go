from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.security import REFRESH_COOKIE_NAME, TokenType, create_token
from tests.conftest import create_organizer


def login(
    client: TestClient,
    email: str = "organizer@example.com",
    password: str = "secret123",
):
    return client.post(
        "/api/auth/login/",
        json={"email": email, "password": password},
    )


def test_login_returns_access_token_and_refresh_cookie(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    database.commit()

    response = login(client)

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]
    assert client.cookies.get(REFRESH_COOKIE_NAME)


def test_login_rejects_invalid_credentials(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    database.commit()

    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert response.json()["detail"] == "Невірний email або пароль."


def test_login_rejects_inactive_organizer(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123", is_active=False)
    database.commit()

    response = login(client)

    assert response.status_code == 401


def test_me_requires_access_token(client: TestClient) -> None:
    response = client.get("/api/auth/me/")

    assert response.status_code == 401


def test_me_returns_current_organizer(client: TestClient, database: Session) -> None:
    create_organizer(database, password="secret123")
    database.commit()
    token = login(client).json()["access_token"]

    response = client.get(
        "/api/auth/me/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "organizer@example.com"
    assert response.json()["full_name"] == "Test Organizer"


def test_refresh_issues_new_access_token(client: TestClient, database: Session) -> None:
    create_organizer(database, password="secret123")
    database.commit()
    login(client)

    response = client.post("/api/auth/refresh/")

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_refresh_rejects_expired_token(client: TestClient, database: Session) -> None:
    organizer = create_organizer(database, password="secret123")
    database.commit()
    expired = create_token(
        str(organizer.id),
        TokenType.REFRESH,
        timedelta(seconds=-1),
    )
    client.cookies.set(REFRESH_COOKIE_NAME, expired, path="/api/auth")

    response = client.post("/api/auth/refresh/")

    assert response.status_code == 401


def test_logout_clears_refresh_cookie(client: TestClient, database: Session) -> None:
    create_organizer(database, password="secret123")
    database.commit()
    login(client)

    response = client.post("/api/auth/logout/")

    assert response.status_code == 204
    assert client.cookies.get(REFRESH_COOKIE_NAME) in {None, ""}

    refresh_response = client.post("/api/auth/refresh/")
    assert refresh_response.status_code == 401


def test_expired_access_token_is_rejected(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database, password="secret123")
    database.commit()
    expired_access = create_token(
        str(organizer.id),
        TokenType.ACCESS,
        timedelta(seconds=-1),
    )

    response = client.get(
        "/api/auth/me/",
        headers={"Authorization": f"Bearer {expired_access}"},
    )

    assert response.status_code == 401
    assert "токен" in response.json()["detail"].lower()
