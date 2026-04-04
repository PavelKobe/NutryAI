"""add features column to subscription_plans

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-04-04

"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FREE_FEATURES = [
    {"text": "7 дней бесплатно", "included": True},
    {"text": "Дневник питания", "included": True},
    {"text": "База данных 500K+ блюд", "included": True},
    {"text": "Базовая аналитика КБЖУ", "included": True},
    {"text": "ИИ-чат (20 запросов/день)", "included": True},
    {"text": "Персональный план питания", "included": False},
    {"text": "Безлимитное распознавание фото", "included": False},
    {"text": "Расширенная аналитика и отчёты", "included": False},
    {"text": "Генерация рецептов по ИИ", "included": False},
    {"text": "Приоритетная поддержка", "included": False},
]

PREMIUM_FEATURES = [
    {"text": "Безлимитный дневник питания", "included": True},
    {"text": "Безлимитное распознавание по фото", "included": True},
    {"text": "База данных 2M+ блюд", "included": True},
    {"text": "Расширенная аналитика и экспорт PDF", "included": True},
    {"text": "100 ИИ-запросов в день", "included": True},
    {"text": "Персональный план питания", "included": True},
    {"text": "Генерация рецептов под цели", "included": True},
    {"text": "Трекинг воды и микронутриентов", "included": True},
    {"text": "Приоритетная поддержка 24/7", "included": True},
]


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing = {col["name"] for col in insp.get_columns("subscription_plans")}

    if "features" not in existing:
        op.add_column("subscription_plans", sa.Column("features", sa.JSON(), nullable=True))

    # Seed default features for existing plans
    op.execute(
        f"""
        UPDATE subscription_plans
        SET features = '{json.dumps(FREE_FEATURES, ensure_ascii=False)}'::json
        WHERE id = 'plan_free_v1' AND features IS NULL
        """
    )
    op.execute(
        f"""
        UPDATE subscription_plans
        SET features = '{json.dumps(PREMIUM_FEATURES, ensure_ascii=False)}'::json
        WHERE id = 'plan_all_inclusive_v1' AND features IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("subscription_plans", "features")
