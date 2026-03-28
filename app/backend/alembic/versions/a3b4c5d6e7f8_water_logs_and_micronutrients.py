"""water_logs table and micronutrients columns

Revision ID: a3b4c5d6e7f8
Revises: f1a2b3c4d5e6
Create Date: 2026-03-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Create water_logs table if not exists
    if not insp.has_table("water_logs"):
        op.create_table(
            "water_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("amount_ml", sa.Integer(), nullable=False),
            sa.Column("logged_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_water_logs_id", "water_logs", ["id"])
        op.create_index("ix_water_logs_user_id", "water_logs", ["user_id"])
    
    # Add micronutrient columns to meal_logs
    if insp.has_table("meal_logs"):
        cols = {c["name"] for c in insp.get_columns("meal_logs")}
        
        micronutrient_cols = {
            # General
            "fiber_g": sa.Float(),
            "sugar_g": sa.Float(),
            "sodium_mg": sa.Float(),
            "cholesterol_mg": sa.Float(),
            "saturated_fat_g": sa.Float(),
            "trans_fat_g": sa.Float(),
            # Vitamins
            "vitamin_a_mcg": sa.Float(),
            "vitamin_c_mg": sa.Float(),
            "vitamin_d_mcg": sa.Float(),
            "vitamin_e_mg": sa.Float(),
            "vitamin_k_mcg": sa.Float(),
            "vitamin_b1_mg": sa.Float(),
            "vitamin_b2_mg": sa.Float(),
            "vitamin_b3_mg": sa.Float(),
            "vitamin_b5_mg": sa.Float(),
            "vitamin_b6_mg": sa.Float(),
            "vitamin_b7_mcg": sa.Float(),
            "vitamin_b9_mcg": sa.Float(),
            "vitamin_b12_mcg": sa.Float(),
            # Minerals
            "calcium_mg": sa.Float(),
            "iron_mg": sa.Float(),
            "magnesium_mg": sa.Float(),
            "phosphorus_mg": sa.Float(),
            "potassium_mg": sa.Float(),
            "zinc_mg": sa.Float(),
            "copper_mg": sa.Float(),
            "manganese_mg": sa.Float(),
            "selenium_mcg": sa.Float(),
            "fluoride_mg": sa.Float(),
        }
        
        for col_name, col_type in micronutrient_cols.items():
            if col_name not in cols:
                op.add_column("meal_logs", sa.Column(col_name, col_type, nullable=True))
    
    # Add water and micronutrient targets to user_profiles
    if insp.has_table("user_profiles"):
        cols = {c["name"] for c in insp.get_columns("user_profiles")}
        
        target_cols = {
            "target_water_ml": sa.Integer(),
            "target_fiber_g": sa.Float(),
            "target_sodium_mg": sa.Float(),
            "target_sugar_g": sa.Float(),
            "target_vitamin_a_mcg": sa.Float(),
            "target_vitamin_c_mg": sa.Float(),
            "target_vitamin_d_mcg": sa.Float(),
            "target_vitamin_e_mg": sa.Float(),
            "target_vitamin_k_mcg": sa.Float(),
            "target_vitamin_b12_mcg": sa.Float(),
            "target_folate_mcg": sa.Float(),
            "target_calcium_mg": sa.Float(),
            "target_iron_mg": sa.Float(),
            "target_magnesium_mg": sa.Float(),
            "target_potassium_mg": sa.Float(),
            "target_zinc_mg": sa.Float(),
        }
        
        for col_name, col_type in target_cols.items():
            if col_name not in cols:
                op.add_column("user_profiles", sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Drop water_logs table
    if insp.has_table("water_logs"):
        op.drop_index("ix_water_logs_user_id", table_name="water_logs")
        op.drop_index("ix_water_logs_id", table_name="water_logs")
        op.drop_table("water_logs")
    
    # Remove micronutrient columns from meal_logs
    if insp.has_table("meal_logs"):
        cols = {c["name"] for c in insp.get_columns("meal_logs")}
        
        micronutrient_cols = [
            "fiber_g", "sugar_g", "sodium_mg", "cholesterol_mg", "saturated_fat_g", "trans_fat_g",
            "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_e_mg", "vitamin_k_mcg",
            "vitamin_b1_mg", "vitamin_b2_mg", "vitamin_b3_mg", "vitamin_b5_mg", "vitamin_b6_mg",
            "vitamin_b7_mcg", "vitamin_b9_mcg", "vitamin_b12_mcg",
            "calcium_mg", "iron_mg", "magnesium_mg", "phosphorus_mg", "potassium_mg",
            "zinc_mg", "copper_mg", "manganese_mg", "selenium_mcg", "fluoride_mg",
        ]
        
        for col_name in micronutrient_cols:
            if col_name in cols:
                op.drop_column("meal_logs", col_name)
    
    # Remove target columns from user_profiles
    if insp.has_table("user_profiles"):
        cols = {c["name"] for c in insp.get_columns("user_profiles")}
        
        target_cols = [
            "target_water_ml", "target_fiber_g", "target_sodium_mg", "target_sugar_g",
            "target_vitamin_a_mcg", "target_vitamin_c_mg", "target_vitamin_d_mcg",
            "target_vitamin_e_mg", "target_vitamin_k_mcg", "target_vitamin_b12_mcg",
            "target_folate_mcg", "target_calcium_mg", "target_iron_mg", "target_magnesium_mg",
            "target_potassium_mg", "target_zinc_mg",
        ]
        
        for col_name in target_cols:
            if col_name in cols:
                op.drop_column("user_profiles", col_name)