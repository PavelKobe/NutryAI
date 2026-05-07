"""add coaching tables and extend payments with product_type

Revision ID: g7b8c9d0e1f2
Revises: d5e6f7a8b9c0
Create Date: 2026-05-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # ── coaching_plans ──────────────────────────────────────────────────────
    if not insp.has_table("coaching_plans"):
        op.create_table(
            "coaching_plans",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column(
                "duration_days",
                sa.Integer(),
                nullable=False,
                server_default="30",
            ),
            sa.Column("features", sa.JSON(), nullable=True),
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    # Seed singleton plan (idempotent)
    op.execute(
        """
        INSERT INTO coaching_plans (id, name, description, price, duration_days, features, is_active)
        VALUES (
            'coaching_v1',
            'Сопровождение нутрициолога 24/7',
            'Индивидуальное сопровождение нутрициолога — личный чат с экспертом, разбор вашего рациона и плана питания, поддержка на пути к цели 24/7.',
            15000.00,
            30,
            '[
                {"text": "Персональный чат с нутрициологом 24/7", "included": true},
                {"text": "Индивидуальная корректировка плана питания", "included": true},
                {"text": "Разбор дневника питания", "included": true},
                {"text": "Поддержка и мотивация на пути к цели", "included": true},
                {"text": "Ответы на вопросы в течение дня", "included": true}
            ]'::json,
            TRUE
        )
        ON CONFLICT (id) DO NOTHING
        """
    )

    # ── coaching_subscriptions ──────────────────────────────────────────────
    if not insp.has_table("coaching_subscriptions"):
        op.create_table(
            "coaching_subscriptions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "user_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "plan_id",
                sa.String(36),
                sa.ForeignKey("coaching_plans.id"),
                nullable=False,
            ),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column(
                "payment_id",
                sa.String(36),
                sa.ForeignKey("payments.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "assigned_nutritionist_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

        op.create_index(
            "ix_coaching_subscriptions_user_id",
            "coaching_subscriptions",
            ["user_id"],
        )
        op.create_index(
            "ix_coaching_subscriptions_user_active",
            "coaching_subscriptions",
            ["user_id", "status", "expires_at"],
        )
        op.create_index(
            "ix_coaching_subscriptions_expires_at",
            "coaching_subscriptions",
            ["expires_at"],
        )
        op.create_index(
            "ix_coaching_subscriptions_payment_id",
            "coaching_subscriptions",
            ["payment_id"],
        )

    # ── coaching_messages ───────────────────────────────────────────────────
    if not insp.has_table("coaching_messages"):
        op.create_table(
            "coaching_messages",
            sa.Column(
                "id",
                sa.BigInteger(),
                primary_key=True,
                autoincrement=True,
            ),
            sa.Column(
                "client_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "sender_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("sender_role", sa.String(16), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("read_by_client_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "read_by_nutritionist_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

        op.create_index(
            "ix_coaching_messages_client_id_id",
            "coaching_messages",
            ["client_id", "id"],
        )

    # ── extend payments ─────────────────────────────────────────────────────
    existing_payment_cols = {col["name"] for col in insp.get_columns("payments")}

    if "product_type" not in existing_payment_cols:
        op.add_column(
            "payments",
            sa.Column("product_type", sa.String(32), nullable=True),
        )
        op.create_index(
            "ix_payments_product_type",
            "payments",
            ["product_type"],
        )

    if "coaching_plan_id" not in existing_payment_cols:
        op.add_column(
            "payments",
            sa.Column(
                "coaching_plan_id",
                sa.String(36),
                sa.ForeignKey("coaching_plans.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    existing_payment_cols = {col["name"] for col in insp.get_columns("payments")}

    if "coaching_plan_id" in existing_payment_cols:
        op.drop_column("payments", "coaching_plan_id")

    if "product_type" in existing_payment_cols:
        op.drop_index("ix_payments_product_type", table_name="payments")
        op.drop_column("payments", "product_type")

    if insp.has_table("coaching_messages"):
        op.drop_index(
            "ix_coaching_messages_client_id_id",
            table_name="coaching_messages",
        )
        op.drop_table("coaching_messages")

    if insp.has_table("coaching_subscriptions"):
        op.drop_index(
            "ix_coaching_subscriptions_payment_id",
            table_name="coaching_subscriptions",
        )
        op.drop_index(
            "ix_coaching_subscriptions_expires_at",
            table_name="coaching_subscriptions",
        )
        op.drop_index(
            "ix_coaching_subscriptions_user_active",
            table_name="coaching_subscriptions",
        )
        op.drop_index(
            "ix_coaching_subscriptions_user_id",
            table_name="coaching_subscriptions",
        )
        op.drop_table("coaching_subscriptions")

    if insp.has_table("coaching_plans"):
        op.drop_table("coaching_plans")
