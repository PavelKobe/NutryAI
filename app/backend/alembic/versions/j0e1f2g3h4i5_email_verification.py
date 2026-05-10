"""email verification: users.email_verified + email_verification_codes table

Revision ID: j0e1f2g3h4i5
Revises: i9d0e1f2g3h4
Create Date: 2026-05-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j0e1f2g3h4i5"
down_revision: Union[str, Sequence[str], None] = "i9d0e1f2g3h4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    user_columns = {col["name"] for col in insp.get_columns("users")}

    if "email_verified" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "email_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
        # Бэкфилл: все существующие юзеры считаются подтверждёнными,
        # иначе они не смогут залогиниться после миграции.
        op.execute("UPDATE users SET email_verified = true WHERE email_verified = false")

    if "email_verified_at" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "email_verified_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )
        op.execute("UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL")

    existing_tables = set(insp.get_table_names())
    if "email_verification_codes" not in existing_tables:
        op.create_table(
            "email_verification_codes",
            sa.Column("user_id", sa.String(length=255), nullable=False),
            sa.Column("code_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id"),
        )
        op.create_index(
            "ix_email_verification_codes_user_id",
            "email_verification_codes",
            ["user_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if "email_verification_codes" in set(insp.get_table_names()):
        op.drop_index("ix_email_verification_codes_user_id", table_name="email_verification_codes")
        op.drop_table("email_verification_codes")

    user_columns = {col["name"] for col in insp.get_columns("users")}
    if "email_verified_at" in user_columns:
        op.drop_column("users", "email_verified_at")
    if "email_verified" in user_columns:
        op.drop_column("users", "email_verified")
