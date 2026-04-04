"""
Pydantic schemas for subscription endpoints.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    daily_ai_limit: int
    trial_days: Optional[int] = None
    features: Optional[list[dict[str, Any]]] = None

    class Config:
        from_attributes = True


class UserSubscriptionResponse(BaseModel):
    plan_id: str
    plan_name: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    ai_requests_today: int
    daily_ai_limit: int
    requests_date: date
    is_expired: bool

    class Config:
        from_attributes = True


class SubscriptionStatusResponse(BaseModel):
    subscription: UserSubscriptionResponse
    plans: list[SubscriptionPlanResponse]


# ── Admin schemas ──────────────────────────────────────────────────────────────

class AdminSubscriptionOut(BaseModel):
    user_id: str
    user_email: str
    plan_id: str
    plan_name: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    ai_requests_today: int
    daily_ai_limit: int
    requests_date: date


class AdminSubscriptionListResponse(BaseModel):
    items: list[AdminSubscriptionOut]
    total: int
    skip: int
    limit: int


class AdminSubscriptionActivate(BaseModel):
    plan_id: str
    expires_at: Optional[datetime] = None   # None = бессрочно


class AdminPlanPatch(BaseModel):
    name: Optional[str] = None
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    daily_ai_limit: Optional[int] = None
    features: Optional[list[dict[str, Any]]] = None
