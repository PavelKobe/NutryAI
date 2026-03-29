"""Add user_id and logged_at indexes to water_logs and meal_logs

Revision ID: d4e5f6a7b8c9
Revises: a3b4c5d6e7f8
Create Date: 2026-03-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # water_logs indexes
    if insp.has_table("water_logs"):
        existing_indexes = {idx["name"] for idx in insp.get_indexes("water_logs")}
        
        if "ix_water_logs_logged_at" not in existing_indexes:
            op.create_index("ix_water_logs_logged_at", "water_logs", ["logged_at"])
        
        if "ix_water_logs_user_id_logged_at" not in existing_indexes:
            op.create_index("ix_water_logs_user_id_logged_at", "water_logs", ["user_id", "logged_at"])

    # meal_logs indexes
    if insp.has_table("meal_logs"):
        existing_indexes = {idx["name"] for idx in insp.get_indexes("meal_logs")}
        
        if "ix_meal_logs_user_id" not in existing_indexes:
            op.create_index("ix_meal_logs_user_id", "meal_logs", ["user_id"])
        
        if "ix_meal_logs_logged_at" not in existing_indexes:
            op.create_index("ix_meal_logs_logged_at", "meal_logs", ["logged_at"])
        
        if "ix_meal_logs_user_id_logged_at" not in existing_indexes:
            op.create_index("ix_meal_logs_user_id_logged_at", "meal_logs", ["user_id", "logged_at"])

    # weight_logs indexes
    if insp.has_table("weight_logs"):
        existing_indexes = {idx["name"] for idx in insp.get_indexes("weight_logs")}
        
        if "ix_weight_logs_user_id" not in existing_indexes:
            op.create_index("ix_weight_logs_user_id", "weight_logs", ["user_id"])
        
        if "ix_weight_logs_logged_at" not in existing_indexes:
            op.create_index("ix_weight_logs_logged_at", "weight_logs", ["logged_at"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_water_logs_logged_at", table_name="water_logs")
    op.drop_index("ix_water_logs_user_id_logged_at", table_name="water_logs")
    op.drop_index("ix_meal_logs_user_id", table_name="meal_logs")
    op.drop_index("ix_meal_logs_logged_at", table_name="meal_logs")
    op.drop_index("ix_meal_logs_user_id_logged_at", table_name="meal_logs")
    op.drop_index("ix_weight_logs_user_id", table_name="weight_logs")
    op.drop_index("ix_weight_logs_logged_at", table_name="weight_logs")