"""drop is_active from organizers and admins

Revision ID: e4b2c8d1a6f3
Revises: d1a9e7c3b5f0
Create Date: 2026-10-01 10:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e4b2c8d1a6f3"
down_revision: str | Sequence[str] | None = "d1a9e7c3b5f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("organizers") as batch_op:
        batch_op.drop_column("is_active")
    with op.batch_alter_table("admins") as batch_op:
        batch_op.drop_column("is_active")


def downgrade() -> None:
    with op.batch_alter_table("organizers") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            )
        )
    with op.batch_alter_table("admins") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            )
        )
