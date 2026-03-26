"""meal_plans: ensure created_at exists (sort -created_at)

Revision ID: f2a3b4c5d6e7
Revises: f1a2b3c4d5e6
Create Date: 2026-03-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("meal_plans"):
        return
    cols = {c["name"] for c in insp.get_columns("meal_plans")}
    if "created_at" not in cols:
        op.add_column(
            "meal_plans",
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("meal_plans"):
        return
    cols = {c["name"] for c in insp.get_columns("meal_plans")}
    if "created_at" in cols:
        op.drop_column("meal_plans", "created_at")
