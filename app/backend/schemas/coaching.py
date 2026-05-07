"""Pydantic schemas for coaching endpoints."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ── Plan ─────────────────────────────────────────────────────────────────────


class CoachingPlanResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_days: int
    features: Optional[list[dict[str, Any]]] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class CoachingPlanPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    duration_days: Optional[int] = None
    features: Optional[list[dict[str, Any]]] = None
    is_active: Optional[bool] = None


# ── Status ───────────────────────────────────────────────────────────────────


class CoachingStatusResponse(BaseModel):
    has_active: bool
    status: Literal["none", "active", "expired"]
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    days_left: int = 0
    plan: CoachingPlanResponse


# ── Payment ──────────────────────────────────────────────────────────────────


class CoachingPaymentCreateRequest(BaseModel):
    """Тело запроса на создание платежа за сопровождение. Тело пустое."""


class CoachingPaymentCreateResponse(BaseModel):
    payment_id: str
    confirmation_url: str


# ── Messages ─────────────────────────────────────────────────────────────────


class CoachingMessageOut(BaseModel):
    id: int
    sender_role: Literal["client", "nutritionist"]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class CoachingMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class CoachingMessagesPage(BaseModel):
    items: list[CoachingMessageOut]
    last_id: int = 0


# ── Admin ────────────────────────────────────────────────────────────────────


class AdminCoachingClientOut(BaseModel):
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    status: Literal["active", "expired"]
    started_at: datetime
    expires_at: datetime
    days_left: int
    last_message_at: Optional[datetime] = None


class AdminCoachingClientListResponse(BaseModel):
    items: list[AdminCoachingClientOut]
    total: int
    skip: int
    limit: int


class AdminCoachingClientDetailResponse(BaseModel):
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    status: Literal["active", "expired"]
    started_at: datetime
    expires_at: datetime
    days_left: int


class AdminCoachingExtendResponse(BaseModel):
    user_id: str
    expires_at: datetime
    days_left: int


class AdminCoachingUserCandidate(BaseModel):
    """Кандидат для подключения сопровождения: любой юзер + статус его coaching."""

    user_id: str
    user_email: str
    user_name: Optional[str] = None
    user_role: str
    is_active: bool
    coaching_status: Literal["none", "active", "expired"]
    expires_at: Optional[datetime] = None
    days_left: int = 0


class AdminCoachingUserCandidateList(BaseModel):
    items: list[AdminCoachingUserCandidate]
    total: int
    skip: int
    limit: int


class AdminCoachingClientProfile(BaseModel):
    """Read-only профиль клиента для нутрициолога."""

    user_id: str
    user_email: str
    user_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_fat: Optional[float] = None
    target_carbs: Optional[float] = None
    allergies: Optional[str] = None
    cuisine_preferences: Optional[str] = None
    budget_per_week: Optional[int] = None
    cooking_time_minutes: Optional[int] = None


class AdminCoachingMealLog(BaseModel):
    id: int
    meal_type: Optional[str] = None
    food_name: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    portion_grams: Optional[float] = None
    photo_url: Optional[str] = None
    logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class AdminCoachingMealLogList(BaseModel):
    items: list[AdminCoachingMealLog]


class AdminCoachingMealPlan(BaseModel):
    id: Optional[int] = None
    plan_data: Optional[str] = None
    week_start: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
