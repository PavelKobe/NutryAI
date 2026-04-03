"""
Pydantic schemas for subscription endpoints.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, computed_field


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    daily_ai_limit: int
    trial_days: Optional[int] = None

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
