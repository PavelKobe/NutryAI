from datetime import datetime
from decimal import Decimal
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class AdminUserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminUserPatch(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    role: Optional[Literal["user", "admin"]] = None
    is_active: Optional[bool] = None


class AdminUserListResponse(BaseModel):
    items: List[AdminUserOut]
    total: int
    skip: int
    limit: int


class AdminPaymentOut(BaseModel):
    id: str
    user_id: str
    provider: str
    amount_value: Decimal
    amount_currency: str
    status: str
    yookassa_payment_id: Optional[str] = None
    description: Optional[str] = None
    metadata_json: Optional[Any] = None
    billing: Optional[str] = None
    confirmation_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    captured_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminPaymentListResponse(BaseModel):
    items: List[AdminPaymentOut]
    total: int
    skip: int
    limit: int
