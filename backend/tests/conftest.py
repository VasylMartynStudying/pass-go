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
    capacity: int = 50,
) -> Event:
    event = Event(
        owner_id=organizer.id,
        slug=slug,
        title=title,
        description=f"Опис події {title}",
        starts_at=starts_at or datetime.now(UTC) + timedelta(days=7),
        location=location,
        capacity=capacity,
        status=status,
    )
    session.add(event)
    session.commit()
    return event
