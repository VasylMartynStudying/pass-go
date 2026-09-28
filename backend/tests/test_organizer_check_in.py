from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Registration
from tests.conftest import create_event, create_organizer


def auth_headers(
    client: TestClient,
    email: str = "organizer@example.com",
    password: str = "secret123",
) -> dict[str, str]:
    token = client.post(
        "/api/auth/login/",
        json={"email": email, "password": password},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def add_registration(
    database: Session,
    event_id: int,
    *,
    email: str = "ivan@example.com",
    checked_in_at: datetime | None = None,
) -> Registration:
    registration = Registration(
        event_id=event_id,
        full_name="Іван Петренко",
        email=email,
        checked_in_at=checked_in_at,
    )
    database.add(registration)
    database.commit()
    database.refresh(registration)
    return registration


def test_check_in_accepts_token_and_ticket_url(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    first = add_registration(database, event.id)
    second = add_registration(database, event.id, email="olena@example.com")
    headers = auth_headers(client)

    token_response = client.post(
        "/api/organizer/check-in/",
        headers=headers,
        json={"ticket_token": first.ticket_token},
    )
    url_response = client.post(
        "/api/organizer/check-in/",
        headers=headers,
        json={"ticket_token": f"http://localhost:5173/tickets/{second.ticket_token}/"},
    )

    assert token_response.status_code == 200
    assert token_response.json()["full_name"] == "Іван Петренко"
    assert token_response.json()["event_slug"] == "meetup"
    assert token_response.json()["checked_in_at"]
    assert url_response.status_code == 200
    assert url_response.json()["full_name"] == "Іван Петренко"

    replay = client.post(
        "/api/organizer/check-in/",
        headers=headers,
        json={"ticket_token": first.ticket_token},
    )
    assert replay.status_code == 409


def test_check_in_rejects_already_used_ticket(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    used_at = datetime.now(UTC)
    registration = add_registration(database, event.id, checked_in_at=used_at)

    response = client.post(
        "/api/organizer/check-in/",
        headers=auth_headers(client),
        json={"ticket_token": registration.ticket_token},
    )

    assert response.status_code == 409
    assert "уже використано" in response.json()["detail"]
    database.refresh(registration)
    assert registration.checked_in_at is not None


def test_check_in_rejects_unknown_and_invalid_tickets(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    headers = auth_headers(client)

    missing = client.post(
        "/api/organizer/check-in/",
        headers=headers,
        json={"ticket_token": "11111111-1111-1111-1111-111111111111"},
    )
    invalid = client.post(
        "/api/organizer/check-in/",
        headers=headers,
        json={"ticket_token": "not-a-ticket"},
    )

    assert missing.status_code == 404
    assert invalid.status_code == 404


def test_check_in_rejects_foreign_event_ticket(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    other = create_organizer(database, email="other@example.com", password="secret123")
    event = create_event(database, other, slug="theirs", title="Чужий захід")
    registration = add_registration(database, event.id)

    response = client.post(
        "/api/organizer/check-in/",
        headers=auth_headers(client),
        json={"ticket_token": registration.ticket_token},
    )

    assert response.status_code == 403
    database.refresh(registration)
    assert registration.checked_in_at is None


def test_check_in_requires_auth(client: TestClient, database: Session) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    registration = add_registration(database, event.id)

    response = client.post(
        "/api/organizer/check-in/",
        json={"ticket_token": registration.ticket_token},
    )

    assert response.status_code == 401
