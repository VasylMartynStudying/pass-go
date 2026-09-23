from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, register_sqlite_functions
from app.main import app
from app.models import Event, EventStatus, Organizer

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
event.listen(test_engine, "connect", register_sqlite_functions)


@pytest.fixture(autouse=True)
def database() -> Generator[Session]:
    Base.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        app.dependency_overrides[get_db] = lambda: session
        yield session

    app.dependency_overrides.clear()
    Base.metadata.drop_all(test_engine)


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def create_organizer(session: Session) -> Organizer:
    organizer = Organizer(
        email="organizer@example.com",
        full_name="Test Organizer",
        hashed_password="not-used-yet",
    )
    session.add(organizer)
    session.flush()
    return organizer


def create_event(
    session: Session,
    organizer: Organizer,
    *,
    slug: str,
    title: str,
    status: EventStatus = EventStatus.PUBLISHED,
    starts_at: datetime | None = None,
    location: str = "Київ",
) -> Event:
    event = Event(
        owner_id=organizer.id,
        slug=slug,
        title=title,
        description=f"Опис події {title}",
        starts_at=starts_at or datetime.now(UTC) + timedelta(days=7),
        location=location,
        capacity=50,
        status=status,
    )
    session.add(event)
    session.commit()
    return event


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
