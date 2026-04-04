"""
Admin router for subscription and plan management.

Endpoints:
  GET    /api/v1/admin/subscriptions              — list all user subscriptions
  GET    /api/v1/admin/subscriptions/{user_id}    — single user subscription detail
  POST   /api/v1/admin/subscriptions/{user_id}/activate   — activate without payment
  POST   /api/v1/admin/subscriptions/{user_id}/deactivate — cancel subscription

  GET    /api/v1/admin/plans                      — list all plans
  PATCH  /api/v1/admin/plans/{plan_id}            — update plan fields
"""

import logging
from typing import Optional

from core.database import get_db
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.auth import User
from models.subscription import SubscriptionPlan, UserSubscription
from schemas.auth import UserResponse
from schemas.subscription import (
    AdminPlanPatch,
    AdminSubscriptionActivate,
    AdminSubscriptionListResponse,
    AdminSubscriptionOut,
    SubscriptionPlanResponse,
)
from services.subscription import SubscriptionService
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin", tags=["admin-subscriptions"])
logger = logging.getLogger(__name__)

PAGE = 50


# ── User subscriptions ─────────────────────────────────────────────────────────

@router.get("/subscriptions", response_model=AdminSubscriptionListResponse)
async def list_subscriptions(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(PAGE, ge=1, le=200),
    plan_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    q = (
        select(UserSubscription, SubscriptionPlan, User.email.label("user_email"))
        .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
        .join(User, UserSubscription.user_id == User.id)
    )
    count_q = (
        select(func.count())
        .select_from(UserSubscription)
        .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
        .join(User, UserSubscription.user_id == User.id)
    )

    if plan_id:
        q = q.where(UserSubscription.plan_id == plan_id)
        count_q = count_q.where(UserSubscription.plan_id == plan_id)
    if status_filter:
        q = q.where(UserSubscription.status == status_filter)
        count_q = count_q.where(UserSubscription.status == status_filter)

    total = int((await db.execute(count_q)).scalar_one())
    q = q.order_by(UserSubscription.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).all()

    items = [
        AdminSubscriptionOut(
            user_id=sub.user_id,
            user_email=user_email,
            plan_id=sub.plan_id,
            plan_name=plan.name,
            status=sub.status,
            started_at=sub.started_at,
            expires_at=sub.expires_at,
            ai_requests_today=sub.ai_requests_today,
            daily_ai_limit=plan.daily_ai_limit,
            requests_date=sub.requests_date,
        )
        for sub, plan, user_email in rows
    ]

    return AdminSubscriptionListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/subscriptions/{user_id}", response_model=AdminSubscriptionOut)
async def get_subscription(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(UserSubscription, SubscriptionPlan, User.email.label("user_email"))
            .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
            .join(User, UserSubscription.user_id == User.id)
            .where(UserSubscription.user_id == user_id)
        )
    ).first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    sub, plan, user_email = row
    return AdminSubscriptionOut(
        user_id=sub.user_id,
        user_email=user_email,
        plan_id=sub.plan_id,
        plan_name=plan.name,
        status=sub.status,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        ai_requests_today=sub.ai_requests_today,
        daily_ai_limit=plan.daily_ai_limit,
        requests_date=sub.requests_date,
    )


@router.post("/subscriptions/{user_id}/activate", response_model=AdminSubscriptionOut)
async def activate_subscription(
    user_id: str,
    body: AdminSubscriptionActivate,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Активирует подписку без оплаты (admin action)."""
    # Check plan exists
    plan = (await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == body.plan_id)
    )).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    service = SubscriptionService(db)
    await service.activate_paid_subscription(
        user_id=user_id,
        plan_id=body.plan_id,
        payment_id=None,
        billing="monthly",
        expires_at=body.expires_at,
    )

    return await get_subscription(user_id, _admin, db)


@router.post("/subscriptions/{user_id}/deactivate", response_model=AdminSubscriptionOut)
async def deactivate_subscription(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Отменяет подписку пользователя (admin action)."""
    service = SubscriptionService(db)
    await service.deactivate_subscription(user_id)
    return await get_subscription(user_id, _admin, db)


# ── Plan management ────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[SubscriptionPlanResponse])
async def list_plans(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.created_at))
    plans = result.scalars().all()
    return [SubscriptionPlanResponse.model_validate(p) for p in plans]


@router.patch("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_plan(
    plan_id: str,
    body: AdminPlanPatch,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Частичное обновление тарифного плана (только переданные поля)."""
    plan = (await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
    )).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return SubscriptionPlanResponse.model_validate(plan)

    await db.execute(
        update(SubscriptionPlan)
        .where(SubscriptionPlan.id == plan_id)
        .values(**updates)
    )
    await db.commit()
    await db.refresh(plan)
    return SubscriptionPlanResponse.model_validate(plan)
