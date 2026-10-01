"""create event moderation fields

Revision ID: c8f2b1d0e4a7
Revises: a43d8ca84af3
Create Date: 2026-09-28 12:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8f2b1d0e4a7"
down_revision: str | Sequence[str] | None = "a43d8ca84af3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "moderation_status",
            sa.Enum(
                "PENDING",
                "APPROVED",
                "REJECTED",
                name="moderationstatus",
                native_enum=False,
                length=20,
            ),
            nullable=False,
            server_default="PENDING",
        ),
    )
    op.add_column("events", sa.Column("moderation_comment", sa.Text(), nullable=True))
    op.create_index(
        op.f("ix_events_moderation_status"),
        "events",
        ["moderation_status"],
        unique=False,
    )
    op.execute(
        "UPDATE events SET moderation_status = 'APPROVED' WHERE status = 'PUBLISHED'"
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_events_moderation_status"), table_name="events")
    op.drop_column("events", "moderation_comment")
    op.drop_column("events", "moderation_status")
