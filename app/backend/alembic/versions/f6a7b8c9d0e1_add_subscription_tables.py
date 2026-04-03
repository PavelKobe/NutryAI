"""add subscription_plans and user_subscriptions tables

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # ── subscription_plans ──────────────────────────────────────────────────
    if not insp.has_table("subscription_plans"):
        op.create_table(
            "subscription_plans",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("price_monthly", sa.Numeric(10, 2), nullable=True),
            sa.Column("price_yearly", sa.Numeric(10, 2), nullable=True),
            sa.Column("daily_ai_limit", sa.Integer(), nullable=False),
            sa.Column("trial_days", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    # Seed plans (idempotent)
    op.execute(
        """
        INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, daily_ai_limit, trial_days)
        VALUES
            ('plan_free_v1',          'Free',         NULL,   NULL,   20,  7),
            ('plan_all_inclusive_v1', 'All Inclusive', 499.00, 3990.00, 100, NULL)
        ON CONFLICT (id) DO NOTHING
        """
    )

    # ── user_subscriptions ──────────────────────────────────────────────────
    if not insp.has_table("user_subscriptions"):
        op.create_table(
            "user_subscriptions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "user_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                unique=True,
            ),
            sa.Column(
                "plan_id",
                sa.String(36),
                sa.ForeignKey("subscription_plans.id"),
                nullable=False,
            ),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ai_requests_today", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("requests_date", sa.Date(), nullable=False),
            sa.Column(
                "payment_id",
                sa.String(36),
                sa.ForeignKey("payments.id", ondelete="SET NULL"),
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

        op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=True)
        op.create_index("ix_user_subscriptions_status", "user_subscriptions", ["status"])
        op.create_index("ix_user_subscriptions_expires_at", "user_subscriptions", ["expires_at"])


def downgrade() -> None:
    op.drop_table("user_subscriptions")
    op.drop_table("subscription_plans")
