from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EventStatus, Registration
from tests.conftest import create_event, create_organizer


def register(
    client: TestClient,
    slug: str = "future",
    email: str = "guest@example.com",
    full_name: str = "Іван Петренко",
):
    return client.post(
        f"/api/public/events/{slug}/registrations/",
        json={"full_name": full_name, "email": email},
    )


def test_registers_participant_and_updates_available_seats(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(database, organizer, slug="future", title="Майбутня подія")

    response = register(client, email="  Guest@Example.com ")

    assert response.status_code == 201
    payload = response.json()
    assert payload["full_name"] == "Іван Петренко"
    assert payload["email"] == "guest@example.com"
    assert payload["event_slug"] == "future"
    assert payload["ticket_token"]

    details = client.get("/api/public/events/future")
    assert details.json()["occupied_seats"] == 1
    assert details.json()["available_seats"] == 49


def test_rejects_duplicate_email(client: TestClient, database: Session) -> None:
    organizer = create_organizer(database)
    create_event(database, organizer, slug="future", title="Майбутня подія")
    register(client)

    response = register(client, email="GUEST@example.com")

    assert response.status_code == 409
    assert "уже зареєстровано" in response.json()["detail"]
    assert len(database.scalars(select(Registration)).all()) == 1


def test_rejects_registration_when_event_is_full(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(
        database,
        organizer,
        slug="full-event",
        title="Повний захід",
        capacity=1,
    )
    register(client, slug="full-event", email="first@example.com")

    response = register(client, slug="full-event", email="second@example.com")

    assert response.status_code == 409
    assert "Вільних місць" in response.json()["detail"]


def test_rejects_registration_for_closed_event(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(
        database,
        organizer,
        slug="draft-event",
        title="Чернетка",
        status=EventStatus.DRAFT,
    )
    create_event(
        database,
        organizer,
        slug="past-event",
        title="Минула подія",
        starts_at=datetime.now(UTC) - timedelta(days=1),
    )

    draft_response = register(client, slug="draft-event")
    past_response = register(client, slug="past-event")

    assert draft_response.status_code == 404
    assert past_response.status_code == 409
    assert "закрита" in past_response.json()["detail"]
