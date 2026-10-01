from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import EventStatus, ModerationStatus
from tests.conftest import create_event, create_organizer


def test_catalog_returns_only_published_future_events(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(database, organizer, slug="future", title="Майбутня подія")
    create_event(
        database,
        organizer,
        slug="draft",
        title="Чернетка",
        status=EventStatus.DRAFT,
    )
    create_event(
        database,
        organizer,
        slug="past",
        title="Минула подія",
        starts_at=datetime.now(UTC) - timedelta(days=1),
    )

    response = client.get("/api/public/events")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["slug"] == "future"
    assert response.json()["items"][0]["available_seats"] == 50
    assert response.json()["items"][0]["starts_at"].endswith("Z")


def test_catalog_searches_title_description_and_location(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(
        database,
        organizer,
        slug="python-meetup",
        title="Python Meetup",
        location="Львів",
    )
    create_event(database, organizer, slug="design-day", title="Design Day")

    response = client.get("/api/public/events", params={"search": "львів"})

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["slug"] == "python-meetup"


def test_event_detail_hides_unavailable_event(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(
        database,
        organizer,
        slug="private-event",
        title="Приватна подія",
        status=EventStatus.DRAFT,
    )

    response = client.get("/api/public/events/private-event")

    assert response.status_code == 404


def test_catalog_hides_pending_and_rejected_published_events(
    client: TestClient, database: Session
) -> None:
    organizer = create_organizer(database)
    create_event(
        database,
        organizer,
        slug="waiting",
        title="Чекає модерації",
        moderation_status=ModerationStatus.PENDING,
    )
    create_event(
        database,
        organizer,
        slug="rejected",
        title="Відхилений захід",
        moderation_status=ModerationStatus.REJECTED,
        moderation_comment="Недостатньо деталей.",
    )
    create_event(
        database,
        organizer,
        slug="approved",
        title="Схвалений захід",
        moderation_status=ModerationStatus.APPROVED,
    )

    listing = client.get("/api/public/events")
    hidden = client.get("/api/public/events/waiting")
    register = client.post(
        "/api/public/events/waiting/registrations/",
        json={"full_name": "Іван Петренко", "email": "ivan@example.com"},
    )

    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["slug"] == "approved"
    assert hidden.status_code == 404
    assert register.status_code == 404
