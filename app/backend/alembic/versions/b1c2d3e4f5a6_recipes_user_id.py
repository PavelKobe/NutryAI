"""recipes user_id for per-user isolation

Revision ID: b1c2d3e4f5a6
Revises: a3b4c5d6e7f8
Create Date: 2026-03-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("recipes"):
        return
    cols = {c["name"] for c in insp.get_columns("recipes")}
    if "user_id" not in cols:
        op.add_column("recipes", sa.Column("user_id", sa.String(), nullable=True))
        op.create_index("ix_recipes_user_id", "recipes", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("recipes"):
        return
    cols = {c["name"] for c in insp.get_columns("recipes")}
    if "user_id" in cols:
        op.drop_index("ix_recipes_user_id", table_name="recipes")
        op.drop_column("recipes", "user_id")
