"""extend payments table for yookassa integration

Revision ID: a1b2c3d4e5f7
Revises: f6a7b8c9d0e1
Create Date: 2026-04-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_columns = {col["name"] for col in insp.get_columns("payments")}

    if "confirmation_url" not in existing_columns:
        op.add_column("payments", sa.Column("confirmation_url", sa.Text(), nullable=True))

    if "paid_at" not in existing_columns:
        op.add_column(
            "payments",
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "billing" not in existing_columns:
        op.add_column("payments", sa.Column("billing", sa.String(16), nullable=True))

    if "cancellation_reason" not in existing_columns:
        op.add_column(
            "payments", sa.Column("cancellation_reason", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    op.drop_column("payments", "cancellation_reason")
    op.drop_column("payments", "billing")
    op.drop_column("payments", "paid_at")
    op.drop_column("payments", "confirmation_url")
