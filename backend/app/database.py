from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)


def register_sqlite_functions(dbapi_connection, _connection_record) -> None:
    dbapi_connection.create_function(
        "casefold",
        1,
        lambda value: value.casefold() if value is not None else None,
        deterministic=True,
    )


if settings.database_url.startswith("sqlite"):
    event.listen(engine, "connect", register_sqlite_functions)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session]:
    with SessionLocal() as session:
        yield session
