"""
Coaching router — пользовательские эндпоинты услуги «Сопровождение нутрициолога».

  GET  /api/v1/coaching/plan              — карточка услуги
  GET  /api/v1/coaching/status            — состояние подписки текущего юзера
  POST /api/v1/coaching/payments/create   — создать платёж YooKassa
  GET  /api/v1/coaching/messages          — история сообщений (read-only всегда доступна)
  POST /api/v1/coaching/messages          — отправить сообщение (нужна активная подписка)
"""

import logging
import uuid
from typing import Optional

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from models.payment import Payment
from schemas.auth import UserResponse
from schemas.coaching import (
    CoachingMessageCreate,
    CoachingMessageOut,
    CoachingMessagesPage,
    CoachingPaymentCreateRequest,
    CoachingPaymentCreateResponse,
    CoachingPlanResponse,
    CoachingStatusResponse,
)
from services.coaching import COACHING_PLAN_ID, CoachingService
from services.push_service import PushService, _push_send_safe
from services.yookassa_service import YooKassaService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/coaching", tags=["coaching"])
logger = logging.getLogger(__name__)


# ── Plan & status ────────────────────────────────────────────────────────────


@router.get("/plan", response_model=CoachingPlanResponse)
async def get_coaching_plan(
    _user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    plan = await service.get_plan()
    return CoachingPlanResponse.model_validate(plan)


@router.get("/status", response_model=CoachingStatusResponse)
async def get_coaching_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    return await service.get_status(current_user.id)


# ── Payments ─────────────────────────────────────────────────────────────────


@router.post("/payments/create", response_model=CoachingPaymentCreateResponse)
async def create_coaching_payment(
    _payload: CoachingPaymentCreateRequest = CoachingPaymentCreateRequest(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создаёт платёж YooKassa за подписку на сопровождение."""
    service = CoachingService(db)
    plan = await service.get_plan()

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Услуга временно недоступна",
        )

    amount = plan.price
    description = f"{plan.name} — {plan.duration_days} дн."

    local_id = str(uuid.uuid4())
    return_url = (
        f"{settings.yookassa_return_url}?payment_id={local_id}&product=coaching"
    )

    db_payment = Payment(
        id=local_id,
        user_id=current_user.id,
        provider="yookassa",
        amount_value=amount,
        amount_currency="RUB",
        status="pending",
        description=description,
        billing="monthly",
        product_type="coaching",
        coaching_plan_id=plan.id,
    )
    db.add(db_payment)
    await db.flush()

    try:
        yk_service = YooKassaService()
        confirmation_url, yookassa_payment_id = await yk_service.create_payment(
            amount=amount,
            description=description,
            return_url=return_url,
            billing="monthly",
            idempotency_key=local_id,
            extra_metadata={
                "product_type": "coaching",
                "coaching_plan_id": plan.id,
            },
        )
    except Exception as exc:
        await db.rollback()
        logger.error("YooKassa create_payment (coaching) error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка создания платежа. Попробуйте позже.",
        ) from exc

    db_payment.confirmation_url = confirmation_url
    db_payment.yookassa_payment_id = yookassa_payment_id
    await db.commit()

    return CoachingPaymentCreateResponse(
        payment_id=local_id,
        confirmation_url=confirmation_url,
    )


# ── Messages ─────────────────────────────────────────────────────────────────


@router.get("/messages", response_model=CoachingMessagesPage)
async def list_coaching_messages(
    after: Optional[int] = Query(None, ge=0),
    limit: int = Query(200, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """История сообщений. Read-only история доступна всегда (даже без активной подписки)."""
    service = CoachingService(db)
    messages = await service.list_messages(
        client_id=current_user.id,
        after_id=after,
        limit=limit,
    )

    items = [CoachingService.to_message_out(m) for m in messages]
    last_id = items[-1].id if items else (after or 0)

    return CoachingMessagesPage(items=items, last_id=last_id)


@router.post("/messages", response_model=CoachingMessageOut)
async def send_coaching_message(
    body: CoachingMessageCreate,
    bg: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CoachingService(db)
    msg = await service.send_message(
        client_id=current_user.id,
        sender_id=current_user.id,
        sender_role="client",
        content=body.content,
    )

    # Push fanout всем активным админам
    push = PushService(db)
    admin_ids = await push.list_admin_user_ids()
    if admin_ids:
        sender_name = current_user.name or current_user.email or "Клиент"
        payload = {
            "title": sender_name,
            "body": body.content[:120],
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-192x192.png",
            "tag": f"coaching:{current_user.id}",
            "data": {
                "type": "coaching_message",
                "url": f"/admin/coaching/clients/{current_user.id}",
                "client_id": current_user.id,
                "message_id": msg.id,
            },
        }
        bg.add_task(_push_send_safe, admin_ids, payload)

    return CoachingService.to_message_out(msg)
