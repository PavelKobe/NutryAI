"""Add slug column to products table

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-04-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("slug", sa.String(255), nullable=True))
    op.create_index(op.f("ix_products_slug"), "products", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_products_slug"), table_name="products")
    op.drop_column("products", "slug")
