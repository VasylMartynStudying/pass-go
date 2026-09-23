from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import EventStatus
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
