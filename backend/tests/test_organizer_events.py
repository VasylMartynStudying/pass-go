from datetime import UTC, datetime, timedelta

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


def event_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": "Новий Python Meetup",
        "description": "Опис заходу для організаторського CRUD.",
        "starts_at": (datetime.now(UTC) + timedelta(days=10)).isoformat(),
        "location": "Київ",
        "capacity": 40,
        "status": "published",
    }
    payload.update(overrides)
    return payload


def test_organizer_sees_only_own_events(client: TestClient, database: Session) -> None:
    owner = create_organizer(database, password="secret123")
    other = create_organizer(database, email="other@example.com", password="secret123")
    create_event(database, owner, slug="mine", title="Мій захід")
    create_event(database, other, slug="theirs", title="Чужий захід")

    response = client.get("/api/organizer/events/", headers=auth_headers(client))

    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()["items"]]
    assert slugs == ["mine"]


def test_create_event_generates_slug(client: TestClient, database: Session) -> None:
    create_organizer(database, password="secret123")
    database.commit()

    response = client.post(
        "/api/organizer/events/",
        headers=auth_headers(client),
        json=event_payload(),
    )

    assert response.status_code == 201
    assert response.json()["slug"] == "novyi-python-meetup"
    assert response.json()["status"] == "published"


def test_cannot_update_another_organizer_event(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    other = create_organizer(database, email="other@example.com", password="secret123")
    create_event(database, other, slug="theirs", title="Чужий захід")

    response = client.put(
        "/api/organizer/events/theirs/",
        headers=auth_headers(client),
        json=event_payload(title="Спроба захоплення"),
    )

    assert response.status_code == 404


def test_cannot_reduce_capacity_below_registrations(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="busy", title="Заповнений")
    database.add_all(
        [
            Registration(
                event_id=event.id,
                full_name="Іван Петренко",
                email="ivan@example.com",
            ),
            Registration(
                event_id=event.id,
                full_name="Олена Коваль",
                email="olena@example.com",
            ),
        ]
    )
    database.commit()

    response = client.put(
        "/api/organizer/events/busy/",
        headers=auth_headers(client),
        json=event_payload(capacity=1, title="Заповнений"),
    )

    assert response.status_code == 409
    assert "Місткість" in response.json()["detail"]


def test_delete_rejects_event_with_registrations(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="busy", title="Заповнений")
    database.add(
        Registration(
            event_id=event.id,
            full_name="Іван Петренко",
            email="ivan@example.com",
        )
    )
    database.commit()

    response = client.delete(
        "/api/organizer/events/busy/",
        headers=auth_headers(client),
    )

    assert response.status_code == 409


def test_delete_own_event_without_registrations(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    create_event(database, owner, slug="empty", title="Порожній")

    response = client.delete(
        "/api/organizer/events/empty/",
        headers=auth_headers(client),
    )

    assert response.status_code == 204
    listing = client.get("/api/organizer/events/", headers=auth_headers(client))
    assert listing.json()["total"] == 0
