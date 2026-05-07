"""add stock_grams to user_products for shopping-list accumulation

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-05-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i9d0e1f2g3h4"
down_revision: Union[str, Sequence[str], None] = "h8c9d0e1f2g3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_columns = {col["name"] for col in insp.get_columns("user_products")}

    if "stock_grams" not in existing_columns:
        op.add_column(
            "user_products",
            sa.Column(
                "stock_grams",
                sa.Float(),
                nullable=True,
                server_default="0",
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_columns = {col["name"] for col in insp.get_columns("user_products")}

    if "stock_grams" in existing_columns:
        op.drop_column("user_products", "stock_grams")
