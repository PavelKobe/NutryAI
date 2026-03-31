"""create oidc_states table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if insp.has_table("oidc_states"):
        return

    op.create_table(
        "oidc_states",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("state", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("nonce", sa.String(255), nullable=False, server_default=""),
        sa.Column("code_verifier", sa.String(255), nullable=False, server_default=""),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("oidc_states")
