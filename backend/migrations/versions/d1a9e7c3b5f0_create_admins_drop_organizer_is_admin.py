"""create admins and drop organizer is_admin

Revision ID: d1a9e7c3b5f0
Revises: c8f2b1d0e4a7
Create Date: 2026-09-28 13:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d1a9e7c3b5f0"
down_revision: str | Sequence[str] | None = "c8f2b1d0e4a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admins_email"), "admins", ["email"], unique=True)
    op.execute(
        """
        INSERT INTO admins (
            email, full_name, hashed_password, is_active, created_at, updated_at
        )
        SELECT
            email, full_name, hashed_password, is_active, created_at, updated_at
        FROM organizers
        WHERE is_admin = 1
        """
    )
    op.execute(
        """
        DELETE FROM organizers
        WHERE is_admin = 1
          AND id NOT IN (SELECT owner_id FROM events)
        """
    )
    with op.batch_alter_table("organizers") as batch_op:
        batch_op.drop_column("is_admin")


def downgrade() -> None:
    with op.batch_alter_table("organizers") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_admin",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
    op.drop_index(op.f("ix_admins_email"), table_name="admins")
    op.drop_table("admins")
