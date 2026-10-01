from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ModerationStatus
from tests.conftest import create_admin, create_event, create_organizer


def test_organizer_cannot_log_into_admin(client: TestClient, database: Session) -> None:
    create_organizer(database, password="secret123")
    create_admin(database, password="secret123")
    database.commit()

    denied = client.post(
        "/admin/login",
        data={"username": "organizer@example.com", "password": "secret123"},
    )
    allowed = client.post(
        "/admin/login",
        data={"username": "admin@example.com", "password": "secret123"},
        follow_redirects=False,
    )

    assert denied.status_code == 400
    assert allowed.status_code == 302
    assert "/admin" in allowed.headers["location"]


def test_admin_cannot_use_organizer_login(
    client: TestClient, database: Session
) -> None:
    create_admin(database, password="secret123")
    database.commit()

    response = client.post(
        "/api/auth/login/",
        json={"email": "admin@example.com", "password": "secret123"},
    )

    assert response.status_code == 401


def test_admin_index_requires_login(client: TestClient) -> None:
    response = client.get("/admin/", follow_redirects=False)

    assert response.status_code == 302
    assert "login" in response.headers["location"]


def _login_admin(client: TestClient) -> None:
    response = client.post(
        "/admin/login",
        data={"username": "admin@example.com", "password": "secret123"},
        follow_redirects=False,
    )
    assert response.status_code == 302


def test_admin_event_edit_includes_moderation_fields(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    create_admin(database, password="secret123")
    event = create_event(
        database,
        owner,
        slug="waiting",
        title="Чекає модерації",
        moderation_status=ModerationStatus.PENDING,
    )
    _login_admin(client)

    page = client.get(f"/admin/event/edit/{event.id}")

    assert page.status_code == 200
    assert 'name="moderation_status"' in page.text
    assert 'name="moderation_comment"' in page.text
    assert "pending" in page.text.lower()
