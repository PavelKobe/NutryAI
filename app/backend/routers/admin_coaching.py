"""
Admin coaching router — управление клиентами на личном сопровождении.

  GET  /api/v1/admin/coaching/clients
  GET  /api/v1/admin/coaching/clients/{user_id}
  GET  /api/v1/admin/coaching/clients/{user_id}/messages
  POST /api/v1/admin/coaching/clients/{user_id}/messages
  GET  /api/v1/admin/coaching/clients/{user_id}/profile
  GET  /api/v1/admin/coaching/clients/{user_id}/meal-logs
  GET  /api/v1/admin/coaching/clients/{user_id}/meal-plan
  POST /api/v1/admin/coaching/clients/{user_id}/activate     — активация без оплаты
  POST /api/v1/admin/coaching/clients/{user_id}/extend       — продление без оплаты
  GET  /api/v1/admin/coaching/plan
  PATCH /api/v1/admin/coaching/plan
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from core.database import get_db
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from models.auth import User
from models.coaching import CoachingMessage, CoachingSubscription
from models.meal_logs import Meal_logs
from models.meal_plans import Meal_plans
from models.user_profiles import User_profiles
from schemas.auth import UserResponse
from schemas.coaching import (
    AdminCoachingClientDetailResponse,
    AdminCoachingClientListResponse,
    AdminCoachingClientOut,
    AdminCoachingClientProfile,
    AdminCoachingExtendResponse,
    AdminCoachingMealLog,
    AdminCoachingMealLogList,
    AdminCoachingMealPlan,
    AdminCoachingUserCandidate,
    AdminCoachingUserCandidateList,
    CoachingMessageCreate,
    CoachingMessageOut,
    CoachingMessagesPage,
    CoachingPlanPatch,
    CoachingPlanResponse,
)
from services.coaching import CoachingService
from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin/coaching", tags=["admin-coaching"])
logger = logging.getLogger(__name__)

PAGE = 50


# ── Helpers ──────────────────────────────────────────────────────────────────


def _days_left(expires_at: datetime) -> int:
    now = datetime.now(tz=timezone.utc)
    delta = expires_at - now
    return max(0, delta.days)


def _client_status(expires_at: datetime) -> str:
    return "active" if expires_at > datetime.now(tz=timezone.utc) else "expired"


# ── Plan management ──────────────────────────────────────────────────────────


@router.get("/plan", response_model=CoachingPlanResponse)
async def get_plan(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    plan = await service.get_plan()
    return CoachingPlanResponse.model_validate(plan)


@router.patch("/plan", response_model=CoachingPlanResponse)
async def patch_plan(
    body: CoachingPlanPatch,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    plan = await service.get_plan()

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return CoachingPlanResponse.model_validate(plan)

    for key, val in updates.items():
        setattr(plan, key, val)
    await db.commit()
    await db.refresh(plan)
    return CoachingPlanResponse.model_validate(plan)


# ── Clients list & detail ────────────────────────────────────────────────────


@router.get("/clients", response_model=AdminCoachingClientListResponse)
async def list_clients(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(PAGE, ge=1, le=200),
    search: Optional[str] = Query(None, max_length=255),
    status_filter: str = Query("active", pattern="^(active|expired|all)$", alias="status"),
):
    """
    Список клиентов на сопровождении. Каждый user_id показывается один раз —
    с его последней (самой свежей по expires_at) подпиской.
    """
    now = datetime.now(tz=timezone.utc)

    # Берём для каждого user_id строку с максимальным expires_at
    sub_q = (
        select(
            CoachingSubscription.user_id,
            func.max(CoachingSubscription.expires_at).label("max_expires"),
        )
        .group_by(CoachingSubscription.user_id)
        .subquery()
    )

    base_q = (
        select(CoachingSubscription, User)
        .join(
            sub_q,
            (CoachingSubscription.user_id == sub_q.c.user_id)
            & (CoachingSubscription.expires_at == sub_q.c.max_expires),
        )
        .join(User, CoachingSubscription.user_id == User.id)
    )

    if status_filter == "active":
        base_q = base_q.where(CoachingSubscription.expires_at > now)
    elif status_filter == "expired":
        base_q = base_q.where(CoachingSubscription.expires_at <= now)

    if search:
        needle = f"%{search.strip().lower()}%"
        base_q = base_q.where(
            or_(User.email.ilike(needle), User.name.ilike(needle))
        )

    # total
    total_q = select(func.count()).select_from(base_q.subquery())
    total = int((await db.execute(total_q)).scalar_one())

    base_q = (
        base_q.order_by(desc(CoachingSubscription.expires_at))
        .offset(skip)
        .limit(limit)
    )
    rows = (await db.execute(base_q)).all()

    # Последнее сообщение по каждому user_id (отдельный запрос для тех клиентов, что попали на страницу)
    user_ids = [sub.user_id for sub, _ in rows]
    last_msgs: dict[str, datetime] = {}
    if user_ids:
        last_q = (
            select(
                CoachingMessage.client_id,
                func.max(CoachingMessage.created_at).label("last_at"),
            )
            .where(CoachingMessage.client_id.in_(user_ids))
            .group_by(CoachingMessage.client_id)
        )
        for uid, last_at in (await db.execute(last_q)).all():
            last_msgs[uid] = last_at

    items = [
        AdminCoachingClientOut(
            user_id=sub.user_id,
            user_email=user.email,
            user_name=user.name,
            status=_client_status(sub.expires_at),
            started_at=sub.started_at,
            expires_at=sub.expires_at,
            days_left=_days_left(sub.expires_at),
            last_message_at=last_msgs.get(sub.user_id),
        )
        for sub, user in rows
    ]

    return AdminCoachingClientListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/all-users", response_model=AdminCoachingUserCandidateList
)
async def list_all_users_for_coaching(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(PAGE, ge=1, le=200),
    search: Optional[str] = Query(None, max_length=255),
    coaching_status: Optional[str] = Query(
        None, pattern="^(none|active|expired)$"
    ),
    role: str = Query("user", pattern="^(user|admin|all)$"),
):
    """
    Все пользователи с признаком текущего статуса сопровождения.
    Используется в админке для активации без оплаты.
    """
    now = datetime.now(tz=timezone.utc)

    latest_q = (
        select(
            CoachingSubscription.user_id,
            func.max(CoachingSubscription.expires_at).label("max_expires"),
        )
        .group_by(CoachingSubscription.user_id)
        .subquery()
    )

    base_q = (
        select(User, CoachingSubscription)
        .outerjoin(latest_q, latest_q.c.user_id == User.id)
        .outerjoin(
            CoachingSubscription,
            (CoachingSubscription.user_id == latest_q.c.user_id)
            & (CoachingSubscription.expires_at == latest_q.c.max_expires),
        )
        .where(User.is_active.is_(True))
    )

    if role != "all":
        base_q = base_q.where(User.role == role)

    if search:
        needle = f"%{search.strip().lower()}%"
        base_q = base_q.where(
            or_(User.email.ilike(needle), User.name.ilike(needle))
        )

    if coaching_status == "active":
        base_q = base_q.where(CoachingSubscription.expires_at > now)
    elif coaching_status == "expired":
        base_q = base_q.where(
            (CoachingSubscription.id.isnot(None))
            & (CoachingSubscription.expires_at <= now)
        )
    elif coaching_status == "none":
        base_q = base_q.where(CoachingSubscription.id.is_(None))

    total_q = select(func.count()).select_from(base_q.subquery())
    total = int((await db.execute(total_q)).scalar_one())

    base_q = (
        base_q.order_by(
            # Сначала активные (expires_at > now), потом истёкшие, потом без подписки
            CoachingSubscription.expires_at.desc().nulls_last(),
            User.created_at.desc().nulls_last(),
        )
        .offset(skip)
        .limit(limit)
    )

    rows = (await db.execute(base_q)).all()

    items: list[AdminCoachingUserCandidate] = []
    for user, sub in rows:
        if sub is None:
            coaching_state: str = "none"
            expires_at: Optional[datetime] = None
            days_left = 0
        else:
            expires_at = sub.expires_at
            coaching_state = "active" if sub.expires_at > now else "expired"
            days_left = _days_left(sub.expires_at)
        items.append(
            AdminCoachingUserCandidate(
                user_id=user.id,
                user_email=user.email,
                user_name=user.name,
                user_role=user.role,
                is_active=user.is_active,
                coaching_status=coaching_state,
                expires_at=expires_at,
                days_left=days_left,
            )
        )

    return AdminCoachingUserCandidateList(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


async def _get_latest_subscription_with_user(
    db: AsyncSession, user_id: str
) -> tuple[Optional[CoachingSubscription], Optional[User]]:
    user_row = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user_row is None:
        return None, None

    sub_row = (
        await db.execute(
            select(CoachingSubscription)
            .where(CoachingSubscription.user_id == user_id)
            .order_by(desc(CoachingSubscription.expires_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    return sub_row, user_row


@router.get("/clients/{user_id}", response_model=AdminCoachingClientDetailResponse)
async def get_client(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    sub, user = await _get_latest_subscription_with_user(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coaching subscription not found",
        )

    return AdminCoachingClientDetailResponse(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        status=_client_status(sub.expires_at),
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        days_left=_days_left(sub.expires_at),
    )


# ── Activate / extend ────────────────────────────────────────────────────────


@router.post(
    "/clients/{user_id}/activate", response_model=AdminCoachingExtendResponse
)
async def admin_activate_client(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    days: Optional[int] = Body(None, embed=True, ge=1, le=365),
):
    """
    Активирует сопровождение клиенту без оплаты.

    Если у клиента уже есть активная подписка — продлевает её на `days` дней.
    Если нет — создаёт новую (started_at=now, expires_at=now+days).

    `days` по умолчанию равен duration_days текущего плана (30).
    """
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    service = CoachingService(db)
    plan = await service.get_plan()
    effective_days = days if days is not None else plan.duration_days
    sub = await service.admin_extend(user_id=user_id, days=effective_days)
    return AdminCoachingExtendResponse(
        user_id=user_id,
        expires_at=sub.expires_at,
        days_left=_days_left(sub.expires_at),
    )


@router.post(
    "/clients/{user_id}/extend", response_model=AdminCoachingExtendResponse
)
async def admin_extend_client(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Продление подписки клиенту на N дней без оплаты (alias для /activate)."""
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    service = CoachingService(db)
    sub = await service.admin_extend(user_id=user_id, days=days)
    return AdminCoachingExtendResponse(
        user_id=user_id,
        expires_at=sub.expires_at,
        days_left=_days_left(sub.expires_at),
    )


# ── Messages ─────────────────────────────────────────────────────────────────


@router.get(
    "/clients/{user_id}/messages", response_model=CoachingMessagesPage
)
async def admin_list_messages(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    after: Optional[int] = Query(None, ge=0),
    limit: int = Query(200, ge=1, le=200),
):
    service = CoachingService(db)
    messages = await service.list_messages(client_id=user_id, after_id=after, limit=limit)
    items = [CoachingService.to_message_out(m) for m in messages]
    last_id = items[-1].id if items else (after or 0)
    return CoachingMessagesPage(items=items, last_id=last_id)


@router.post("/clients/{user_id}/messages", response_model=CoachingMessageOut)
async def admin_send_message(
    user_id: str,
    body: CoachingMessageCreate,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    msg = await service.send_message(
        client_id=user_id,
        sender_id=admin.id,
        sender_role="nutritionist",
        content=body.content,
    )
    return CoachingService.to_message_out(msg)


# ── Client data (read-only) ──────────────────────────────────────────────────


@router.get("/clients/{user_id}/profile", response_model=AdminCoachingClientProfile)
async def admin_get_client_profile(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    profile = (
        await db.execute(
            select(User_profiles).where(User_profiles.user_id == user_id)
        )
    ).scalar_one_or_none()

    def _f(val):
        return float(val) if val is not None else None

    return AdminCoachingClientProfile(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        gender=profile.gender if profile else None,
        age=profile.age if profile else None,
        height_cm=profile.height_cm if profile else None,
        weight_kg=_f(profile.weight_kg) if profile else None,
        target_weight_kg=_f(profile.target_weight_kg) if profile else None,
        activity_level=profile.activity_level if profile else None,
        goal=profile.goal if profile else None,
        target_calories=_f(profile.target_calories) if profile else None,
        target_protein=_f(profile.target_protein) if profile else None,
        target_fat=_f(profile.target_fat) if profile else None,
        target_carbs=_f(profile.target_carbs) if profile else None,
        allergies=profile.allergies if profile else None,
        cuisine_preferences=profile.cuisine_preferences if profile else None,
        budget_per_week=profile.budget_per_week if profile else None,
        cooking_time_minutes=profile.cooking_time_minutes if profile else None,
    )


@router.get("/clients/{user_id}/meal-logs", response_model=AdminCoachingMealLogList)
async def admin_get_client_meal_logs(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    q = select(Meal_logs).where(Meal_logs.user_id == user_id)
    if date_from:
        q = q.where(Meal_logs.logged_at >= date_from)
    if date_to:
        q = q.where(Meal_logs.logged_at <= date_to)
    q = q.order_by(desc(Meal_logs.logged_at)).limit(limit)

    rows = (await db.execute(q)).scalars().all()
    items = [
        AdminCoachingMealLog(
            id=r.id,
            meal_type=r.meal_type,
            food_name=r.food_name,
            calories=r.calories,
            protein=r.protein,
            fat=r.fat,
            carbs=r.carbs,
            portion_grams=r.portion_grams,
            photo_url=r.photo_url,
            logged_at=r.logged_at,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return AdminCoachingMealLogList(items=items)


@router.get(
    "/clients/{user_id}/meal-plan", response_model=AdminCoachingMealPlan
)
async def admin_get_client_meal_plan(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(Meal_plans)
            .where(Meal_plans.user_id == user_id)
            .order_by(desc(Meal_plans.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()

    if row is None:
        return AdminCoachingMealPlan()

    return AdminCoachingMealPlan(
        id=row.id,
        plan_data=row.plan_data,
        week_start=row.week_start,
        status=row.status,
        created_at=row.created_at,
    )
