import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models import Event, EventStatus, Organizer, Registration  # noqa: E402
from app.security import hash_password  # noqa: E402

ORGANIZER_EMAIL = "organizer@example.com"
ORGANIZER_PASSWORD = "secret123"


def get_or_create_organizer(session) -> Organizer:
    organizer = session.scalar(
        select(Organizer).where(Organizer.email == ORGANIZER_EMAIL)
    )
    if organizer is None:
        organizer = Organizer(
            email=ORGANIZER_EMAIL,
            full_name="Тестовий організатор",
            hashed_password=hash_password(ORGANIZER_PASSWORD),
            is_active=True,
        )
        session.add(organizer)
        session.flush()
        print(f"Created organizer {ORGANIZER_EMAIL} / {ORGANIZER_PASSWORD}")
    else:
        print(f"Organizer already exists: {ORGANIZER_EMAIL}")
    return organizer


def get_or_create_event(session, organizer: Organizer, **fields) -> Event:
    event = session.scalar(select(Event).where(Event.slug == fields["slug"]))
    if event is None:
        event = Event(owner=organizer, **fields)
        session.add(event)
        session.flush()
        print(f"Created event /{fields['slug']}")
    else:
        print(f"Event already exists: /{fields['slug']}")
    return event


def get_or_create_registration(
    session, event: Event, full_name: str, email: str
) -> None:
    exists = session.scalar(
        select(Registration).where(
            Registration.event_id == event.id,
            Registration.email == email,
        )
    )
    if exists is None:
        session.add(Registration(event=event, full_name=full_name, email=email))
        print(f"Created registration {email} for /{event.slug}")
    else:
        print(f"Registration already exists: {email} on /{event.slug}")


def seed() -> None:
    now = datetime.now(UTC)

    with SessionLocal() as session:
        organizer = get_or_create_organizer(session)

        python_meetup = get_or_create_event(
            session,
            organizer,
            title="Python Meetup у Києві",
            slug="python-meetup-kyiv",
            description="Зустріч розробників Python: доповіді, нетворкінг і Q&A.",
            starts_at=now + timedelta(days=7),
            location="Київ, вул. Хрещатик 1",
            capacity=50,
            status=EventStatus.PUBLISHED,
        )
        get_or_create_event(
            session,
            organizer,
            title="Design Day у Львові",
            slug="design-day-lviv",
            description=(
                "Одноденна конференція з UX, продуктового дизайну та прототипування."
            ),
            starts_at=now + timedelta(days=14),
            location="Львів, пл. Ринок 1",
            capacity=80,
            status=EventStatus.PUBLISHED,
        )
        get_or_create_event(
            session,
            organizer,
            title="Чернетка майбутнього заходу",
            slug="draft-event",
            description="Цей захід не має з’явитися в публічному каталозі.",
            starts_at=now + timedelta(days=21),
            location="Одеса",
            capacity=30,
            status=EventStatus.DRAFT,
        )
        get_or_create_event(
            session,
            organizer,
            title="Минула конференція",
            slug="past-conference",
            description="Цей захід уже відбувся і не має з’явитися в каталозі.",
            starts_at=now - timedelta(days=3),
            location="Харків",
            capacity=100,
            status=EventStatus.PUBLISHED,
        )

        get_or_create_registration(
            session, python_meetup, "Іван Петренко", "ivan@example.com"
        )
        get_or_create_registration(
            session, python_meetup, "Олена Коваль", "olena@example.com"
        )

        session.commit()
        print("Seed completed.")


if __name__ == "__main__":
    seed()
