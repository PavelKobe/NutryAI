"""
Push subscription model — Web Push API VAPID subscriptions per user.
"""

from models.base import Base
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.sql import func


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh_key = Column(String(255), nullable=False)
    auth_key = Column(String(255), nullable=False)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_push_subscriptions_user_id", "user_id"),
    )
