import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    AdminUser,
    Event,
    EventStatus,
    ModerationStatus,
    Organizer,
    Registration,
)
from app.security import hash_password  # noqa: E402

ORGANIZER_EMAIL = "organizer@example.com"
ORGANIZER_PASSWORD = "secret123"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "secret123"


def get_or_create_organizer(
    session,
    *,
    email: str,
    password: str,
    full_name: str,
) -> Organizer:
    organizer = session.scalar(select(Organizer).where(Organizer.email == email))
    if organizer is None:
        organizer = Organizer(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
        )
        session.add(organizer)
        session.flush()
        print(f"Created organizer {email} / {password}")
    else:
        print(f"Organizer already exists: {email}")
    return organizer


def get_or_create_admin(
    session,
    *,
    email: str,
    password: str,
    full_name: str,
) -> AdminUser:
    admin = session.scalar(select(AdminUser).where(AdminUser.email == email))
    if admin is None:
        admin = AdminUser(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
        )
        session.add(admin)
        session.flush()
        print(f"Created admin {email} / {password}")
    else:
        admin.full_name = full_name
        print(f"Admin already exists: {email}")
    return admin


def get_or_create_event(session, organizer: Organizer, **fields) -> Event:
    event = session.scalar(select(Event).where(Event.slug == fields["slug"]))
    if event is None:
        event = Event(owner=organizer, **fields)
        session.add(event)
        session.flush()
        print(f"Created event /{fields['slug']}")
    else:
        for key, value in fields.items():
            setattr(event, key, value)
        print(f"Updated event /{fields['slug']}")
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
        organizer = get_or_create_organizer(
            session,
            email=ORGANIZER_EMAIL,
            password=ORGANIZER_PASSWORD,
            full_name="Тестовий організатор",
        )
        get_or_create_admin(
            session,
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            full_name="PassGo Admin",
        )

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
            moderation_status=ModerationStatus.APPROVED,
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
            moderation_status=ModerationStatus.APPROVED,
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
            title="Захід на модерації",
            slug="pending-review",
            description="Опубліковано організатором і чекає схвалення адміністратора.",
            starts_at=now + timedelta(days=10),
            location="Дніпро",
            capacity=40,
            status=EventStatus.PUBLISHED,
            moderation_status=ModerationStatus.PENDING,
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
            moderation_status=ModerationStatus.APPROVED,
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
