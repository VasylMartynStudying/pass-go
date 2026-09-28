import csv
import io

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Registration
from tests.conftest import create_event, create_organizer
from tests.test_organizer_dashboard import add_attendees, auth_headers


def test_csv_export_includes_bom_headers_and_escaping(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    add_attendees(database, event.id)
    database.add(
        Registration(
            event_id=event.id,
            full_name='Коваль, "Олена"',
            email="quoted@example.com",
        )
    )
    database.commit()

    response = client.get(
        "/api/organizer/events/meetup/attendees.csv/",
        headers=auth_headers(client),
    )

    assert response.status_code == 200
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert "text/csv" in response.headers["content-type"]
    assert "meetup-participants.csv" in response.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert rows[0] == ["Ім’я", "Email", "Зареєстровано", "Check-in"]
    assert [row[1] for row in rows[1:]] == [
        "ivan@example.com",
        "olena@example.com",
        "taras@example.com",
        "quoted@example.com",
    ]
    quoted = rows[-1]
    assert quoted[0] == 'Коваль, "Олена"'
    assert quoted[3] == ""
    assert rows[1][3]


def test_csv_export_applies_search_filter(
    client: TestClient, database: Session
) -> None:
    owner = create_organizer(database, password="secret123")
    event = create_event(database, owner, slug="meetup", title="Meetup")
    add_attendees(database, event.id)

    response = client.get(
        "/api/organizer/events/meetup/attendees.csv/",
        headers=auth_headers(client),
        params={"search": "олена"},
    )

    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert [row[1] for row in rows[1:]] == ["olena@example.com"]


def test_csv_export_hides_other_organizer_event(
    client: TestClient, database: Session
) -> None:
    create_organizer(database, password="secret123")
    other = create_organizer(database, email="other@example.com", password="secret123")
    create_event(database, other, slug="theirs", title="Чужий захід")

    response = client.get(
        "/api/organizer/events/theirs/attendees.csv/",
        headers=auth_headers(client),
    )

    assert response.status_code == 404
