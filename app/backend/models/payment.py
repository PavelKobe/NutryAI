import uuid

from models.base import Base
from sqlalchemy import Column, DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.sql import func


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(32), nullable=False, server_default="yookassa")
    amount_value = Column(Numeric(12, 2), nullable=False)
    amount_currency = Column(String(3), nullable=False, server_default="RUB")
    status = Column(String(32), nullable=False, index=True)
    yookassa_payment_id = Column(String(255), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
