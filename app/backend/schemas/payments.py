"""Pydantic schemas for payment endpoints."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel


class PaymentCreateRequest(BaseModel):
    billing: Literal["monthly", "yearly"]


class PaymentCreateResponse(BaseModel):
    payment_id: str          # внутренний ID платежа в нашей БД
    confirmation_url: str    # URL для редиректа пользователя на оплату


class PaymentOut(BaseModel):
    id: str
    status: str
    amount_value: Decimal
    amount_currency: str
    billing: Optional[str] = None
    description: Optional[str] = None
    yookassa_payment_id: Optional[str] = None
    confirmation_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    product_type: Optional[str] = None
    coaching_plan_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    items: list[PaymentOut]
    total: int


class YooKassaWebhookEvent(BaseModel):
    """Тело webhook-уведомления от YooKassa."""
    type: str    # всегда "notification"
    event: str   # payment.succeeded | payment.canceled | refund.succeeded
    object: dict[str, Any]
