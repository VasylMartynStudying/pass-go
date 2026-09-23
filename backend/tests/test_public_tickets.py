from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import create_event, create_organizer


def test_returns_ticket_by_valid_token(client: TestClient, database: Session) -> None:
    organizer = create_organizer(database)
    create_event(database, organizer, slug="future", title="Майбутня подія")
    created = client.post(
        "/api/public/events/future/registrations/",
        json={"full_name": "Іван Петренко", "email": "guest@example.com"},
    )
    token = created.json()["ticket_token"]

    response = client.get(f"/api/public/tickets/{token}/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ticket_token"] == token
    assert payload["full_name"] == "Іван Петренко"
    assert payload["event_title"] == "Майбутня подія"
    assert payload["event_slug"] == "future"
    assert payload["location"] == "Київ"
    assert "email" not in payload


def test_returns_not_found_for_invalid_token(client: TestClient) -> None:
    response = client.get("/api/public/tickets/00000000-0000-0000-0000-000000000000/")

    assert response.status_code == 404
    assert response.json()["detail"] == "Квиток не знайдено."
