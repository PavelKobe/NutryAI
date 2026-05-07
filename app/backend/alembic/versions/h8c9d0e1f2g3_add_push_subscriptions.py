"""add push_subscriptions table for Web Push notifications

Revision ID: h8c9d0e1f2g3
Revises: g7b8c9d0e1f2
Create Date: 2026-05-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h8c9d0e1f2g3"
down_revision: Union[str, Sequence[str], None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("push_subscriptions"):
        op.create_table(
            "push_subscriptions",
            sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.String(255),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("endpoint", sa.Text(), nullable=False),
            sa.Column("p256dh_key", sa.String(255), nullable=False),
            sa.Column("auth_key", sa.String(255), nullable=False),
            sa.Column("user_agent", sa.String(512), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "last_seen_at", sa.DateTime(timezone=True), nullable=True
            ),
            sa.UniqueConstraint("endpoint", name="ux_push_subscriptions_endpoint"),
        )

        op.create_index(
            "ix_push_subscriptions_user_id",
            "push_subscriptions",
            ["user_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if insp.has_table("push_subscriptions"):
        op.drop_index(
            "ix_push_subscriptions_user_id", table_name="push_subscriptions"
        )
        op.drop_table("push_subscriptions")
