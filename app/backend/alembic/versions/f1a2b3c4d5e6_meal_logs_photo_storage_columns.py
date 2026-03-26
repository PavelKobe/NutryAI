"""meal_logs: photo_object_key, photo_kept_until

Revision ID: f1a2b3c4d5e6
Revises: c3d8e9f1a2b4
Create Date: 2026-03-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c3d8e9f1a2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("meal_logs"):
        return
    cols = {c["name"] for c in insp.get_columns("meal_logs")}
    if "photo_object_key" not in cols:
        op.add_column("meal_logs", sa.Column("photo_object_key", sa.String(), nullable=True))
    if "photo_kept_until" not in cols:
        op.add_column(
            "meal_logs",
            sa.Column("photo_kept_until", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("meal_logs"):
        return
    cols = {c["name"] for c in insp.get_columns("meal_logs")}
    if "photo_kept_until" in cols:
        op.drop_column("meal_logs", "photo_kept_until")
    if "photo_object_key" in cols:
        op.drop_column("meal_logs", "photo_object_key")
