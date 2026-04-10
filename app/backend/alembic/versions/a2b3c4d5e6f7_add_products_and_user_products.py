"""add products and user_products tables

Revision ID: a2b3c4d5e6f7
Revises: f6a7b8c9d0e1
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Глобальный каталог продуктов (кеш штрихкодов + ручные записи) ──────────
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("barcode", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("nutrition_100g", sa.JSON(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("source_api", sa.String(length=50), nullable=False, server_default="manual"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barcode", name="uq_products_barcode"),
    )
    op.create_index("idx_products_id", "products", ["id"], unique=False)
    op.create_index("idx_products_barcode", "products", ["barcode"], unique=True)

    # ── Коллекции пользователей ─────────────────────────────────────────────────
    op.create_table(
        "user_products",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("custom_name", sa.String(length=500), nullable=True),
        sa.Column("serving_g", sa.Float(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_user_products_product_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "product_id", name="uq_user_product"),
    )
    op.create_index("idx_user_products_user_id", "user_products", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_user_products_user_id", table_name="user_products")
    op.drop_table("user_products")

    op.drop_index("idx_products_barcode", table_name="products")
    op.drop_index("idx_products_id", table_name="products")
    op.drop_table("products")
