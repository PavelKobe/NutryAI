"""email auth: users.password_hash, unique email

Revision ID: 7f1a9c2b4d8e
Revises: 5e5a2b8d8f4f
Create Date: 2026-03-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7f1a9c2b4d8e"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.drop_column("users", "password_hash")
