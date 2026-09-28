import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Event

TRANSLIT = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "h",
        "ґ": "g",
        "д": "d",
        "е": "e",
        "є": "ie",
        "ж": "zh",
        "з": "z",
        "и": "y",
        "і": "i",
        "ї": "i",
        "й": "i",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "kh",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "shch",
        "ь": "",
        "ю": "iu",
        "я": "ia",
        "’": "",
        "'": "",
    }
)


def slugify(value: str) -> str:
    transliterated = value.strip().lower().translate(TRANSLIT)
    slug = re.sub(r"[^a-z0-9]+", "-", transliterated).strip("-")
    return slug or "event"


def unique_slug(db: Session, title: str) -> str:
    base = slugify(title)
    slug = base
    suffix = 2
    while db.scalar(select(Event.id).where(Event.slug == slug)):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug
