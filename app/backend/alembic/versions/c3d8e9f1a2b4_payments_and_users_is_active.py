"""payments table; users.is_active

Revision ID: c3d8e9f1a2b4
Revises: 7f1a9c2b4d8e
Create Date: 2026-03-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d8e9f1a2b4"
down_revision: Union[str, Sequence[str], None] = "7f1a9c2b4d8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    user_cols = {c["name"] for c in insp.get_columns("users")}
    if "is_active" not in user_cols:
        op.add_column("users", sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    if not insp.has_table("payments"):
        op.create_table(
            "payments",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=255), nullable=False),
            sa.Column("provider", sa.String(length=32), server_default="yookassa", nullable=False),
            sa.Column("amount_value", sa.Numeric(12, 2), nullable=False),
            sa.Column("amount_currency", sa.String(length=3), server_default="RUB", nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("yookassa_payment_id", sa.String(length=255), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_payments_user_id"), "payments", ["user_id"], unique=False)
        op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
        op.create_index(op.f("ix_payments_yookassa_payment_id"), "payments", ["yookassa_payment_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_payments_yookassa_payment_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_user_id"), table_name="payments")
    op.drop_table("payments")
    op.drop_column("users", "is_active")
