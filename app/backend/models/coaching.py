"""
Coaching models: CoachingPlan, CoachingSubscription, CoachingMessage.

Услуга «Личное сопровождение нутрициолога» — независимый аддон поверх любого
тарифа подписки. Параллельная сущность, не конфликтует с user_subscriptions.
"""

import uuid

from models.base import Base
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.sql import func


class CoachingPlan(Base):
    __tablename__ = "coaching_plans"

    id = Column(String(36), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    duration_days = Column(Integer, nullable=False, default=30, server_default="30")
    features = Column(JSON, nullable=True)  # [{"text": "...", "included": true}]
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CoachingSubscription(Base):
    __tablename__ = "coaching_subscriptions"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id = Column(
        String(36),
        ForeignKey("coaching_plans.id"),
        nullable=False,
    )
    status = Column(String(32), nullable=False)  # active | expired | refunded
    started_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    payment_id = Column(
        String(36),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_nutritionist_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_coaching_subscriptions_user_id", "user_id"),
        Index(
            "ix_coaching_subscriptions_user_active",
            "user_id",
            "status",
            "expires_at",
        ),
        Index("ix_coaching_subscriptions_expires_at", "expires_at"),
        Index("ix_coaching_subscriptions_payment_id", "payment_id"),
    )


class CoachingMessage(Base):
    __tablename__ = "coaching_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    client_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    sender_role = Column(String(16), nullable=False)  # client | nutritionist
    content = Column(Text, nullable=False)
    read_by_client_at = Column(DateTime(timezone=True), nullable=True)
    read_by_nutritionist_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_coaching_messages_client_id_id", "client_id", "id"),
    )
