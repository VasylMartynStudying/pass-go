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


def add_attendees(database: Session, event_id: int) -> None:
    database.add_all(
        [
            Registration(
                event_id=event_id,
                full_name="Іван Петренко",
                email="ivan@example.com",
                checked_in_at=datetime.now(UTC),
            ),
            Registration(
                event_id=event_id,
                full_name="Олена Коваль",
                email="olena@example.com",
            ),
            Registration(
                event_id=event_id,
                full_name="Тарас Шевченко",
                email="taras@example.com",
            ),
        ]
    )
    database.commit()


def test_dashboard_returns_stats_and_attendees(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup", capacity=50)
    add_attendees(database, event.id)

    response = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=auth_headers(client),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"]["occupied_seats"] == 3
    assert payload["event"]["available_seats"] == 47
    assert payload["checked_in_count"] == 1
    assert payload["attendees_total"] == 3
    assert [item["email"] for item in payload["attendees"]] == [
        "ivan@example.com",
        "olena@example.com",
        "taras@example.com",
    ]
    assert payload["attendees"][0]["is_checked_in"] is True
    assert payload["attendees"][1]["is_checked_in"] is False


def test_dashboard_filters_by_search_and_check_in(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    add_attendees(database, event.id)
    headers = auth_headers(client)

    search_response = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=headers,
        params={"search": "олена"},
    )
    checked_in_response = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=headers,
        params={"checked_in": True},
    )
    waiting_response = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=headers,
        params={"checked_in": False},
    )

    assert search_response.json()["attendees_total"] == 1
    assert search_response.json()["attendees"][0]["email"] == "olena@example.com"
    assert checked_in_response.json()["attendees_total"] == 1
    assert waiting_response.json()["attendees_total"] == 2
    assert checked_in_response.json()["event"]["occupied_seats"] == 3


def test_dashboard_paginates_attendees(client: TestClient, database: Session) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    add_attendees(database, event.id)
    headers = auth_headers(client)

    first_page = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=headers,
        params={"limit": 2, "offset": 0},
    )
    second_page = client.get(
        "/api/organizer/events/meetup/dashboard/",
        headers=headers,
        params={"limit": 2, "offset": 2},
    )

    assert first_page.json()["attendees_total"] == 3
    assert [item["email"] for item in first_page.json()["attendees"]] == [
        "ivan@example.com",
        "olena@example.com",
    ]
    assert [item["email"] for item in second_page.json()["attendees"]] == [
        "taras@example.com",
    ]


def test_dashboard_hides_other_organizer_event(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    other = create_organizer(database, email="other@example.com", password="secret123")
    create_event(database, other, slug="theirs", title="Чужий захід")

    response = client.get(
        "/api/organizer/events/theirs/dashboard/",
        headers=auth_headers(client),
    )

    assert response.status_code == 404
