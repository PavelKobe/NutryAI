"""
Subscription models: SubscriptionPlan and UserSubscription.
"""

import uuid

from models.base import Base
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=True)   # NULL for free
    price_yearly = Column(Numeric(10, 2), nullable=True)    # NULL for free
    daily_ai_limit = Column(Integer, nullable=False)         # requests per day
    trial_days = Column(Integer, nullable=True)              # 7 for free, NULL for paid
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    plan_id = Column(
        String(36),
        ForeignKey("subscription_plans.id"),
        nullable=False,
    )
    status = Column(String(32), nullable=False, index=True)  # active | expired | cancelled
    started_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )  # NULL = never expires (paid plan)
    ai_requests_today = Column(Integer, nullable=False, default=0)
    requests_date = Column(Date, nullable=False)  # date for which ai_requests_today counts
    payment_id = Column(
        String(36),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
