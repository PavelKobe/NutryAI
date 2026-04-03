"""
Payment router — создание платежей YooKassa, webhook, история платежей пользователя.
"""

import logging
import uuid
from datetime import datetime, timezone

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from models.payment import Payment
from schemas.auth import UserResponse
from schemas.payments import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentListResponse,
    PaymentOut,
    YooKassaWebhookEvent,
)
from services.subscription import ALL_INCLUSIVE_PLAN_ID, SubscriptionService
from services.yookassa_service import YooKassaService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])
logger = logging.getLogger(__name__)

# Цены тарифов
PLAN_PRICES = {
    "monthly": ("499.00", "Подписка All Inclusive — 1 месяц"),
    "yearly": ("3990.00", "Подписка All Inclusive — 1 год"),
}


@router.post("/create", response_model=PaymentCreateResponse)
async def create_payment(
    payload: PaymentCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создаёт платёж в YooKassa и возвращает URL для редиректа."""
    billing = payload.billing
    amount_str, description = PLAN_PRICES[billing]

    from decimal import Decimal
    amount = Decimal(amount_str)

    # Создаём запись в нашей БД со статусом pending
    local_id = str(uuid.uuid4())
    return_url = f"{settings.yookassa_return_url}?payment_id={local_id}"

    db_payment = Payment(
        id=local_id,
        user_id=current_user.id,
        provider="yookassa",
        amount_value=amount,
        amount_currency="RUB",
        status="pending",
        description=description,
        billing=billing,
    )
    db.add(db_payment)
    await db.flush()  # получаем ID без commit

    # Создаём платёж в YooKassa
    try:
        yk_service = YooKassaService()
        confirmation_url, yookassa_payment_id = await yk_service.create_payment(
            amount=amount,
            description=description,
            return_url=return_url,
            billing=billing,
            idempotency_key=local_id,
        )
    except Exception as exc:
        await db.rollback()
        logger.error("YooKassa create_payment error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка создания платежа. Попробуйте позже.",
        ) from exc

    db_payment.confirmation_url = confirmation_url
    db_payment.yookassa_payment_id = yookassa_payment_id
    await db.commit()

    return PaymentCreateResponse(
        payment_id=local_id,
        confirmation_url=confirmation_url,
    )


@router.get("/my", response_model=PaymentListResponse)
async def my_payments(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список платежей текущего пользователя (новые первые)."""
    total_result = await db.execute(
        select(func.count()).select_from(Payment).where(Payment.user_id == current_user.id)
    )
    total = int(total_result.scalar_one())

    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    payments = result.scalars().all()

    return PaymentListResponse(
        items=[PaymentOut.model_validate(p) for p in payments],
        total=total,
    )


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Статус конкретного платежа пользователя."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.user_id == current_user.id,
        )
    )
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Платёж не найден")
    return PaymentOut.model_validate(payment)


@router.post("/webhook")
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Обработчик webhook-уведомлений от YooKassa.

    Верификация: фетчим платёж из YooKassa API (не доверяем сырому телу),
    проверяем статус и обновляем БД.
    """
    try:
        body = await request.json()
        event = YooKassaWebhookEvent(**body)
    except Exception as exc:
        logger.warning("Invalid webhook body: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")

    yookassa_payment_id: str = event.object.get("id", "")
    logger.info("Webhook received: event=%s payment_id=%s", event.event, yookassa_payment_id)

    if event.event not in ("payment.succeeded", "payment.canceled"):
        # Остальные события (refund.succeeded и т.д.) пока игнорируем
        return {"ok": True}

    # ── Верифицируем: фетчим платёж из YooKassa API ──────────────────────────
    try:
        yk_service = YooKassaService()
        yk_payment = await yk_service.get_payment(yookassa_payment_id)
    except Exception as exc:
        logger.error("Failed to verify payment %s from YooKassa: %s", yookassa_payment_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cannot verify payment",
        )

    # ── Находим платёж в нашей БД по yookassa_payment_id ─────────────────────
    result = await db.execute(
        select(Payment).where(Payment.yookassa_payment_id == yookassa_payment_id)
    )
    db_payment = result.scalar_one_or_none()

    if db_payment is None:
        # Неизвестный платёж — отвечаем 200, чтобы YooKassa не повторял
        logger.warning("Unknown yookassa payment_id: %s", yookassa_payment_id)
        return {"ok": True}

    now = datetime.now(tz=timezone.utc)

    if event.event == "payment.succeeded" and yk_payment.status == "succeeded":
        db_payment.status = "succeeded"
        db_payment.paid_at = now
        db_payment.captured_at = now

        # Активируем подписку
        sub_service = SubscriptionService(db)
        await sub_service.activate_paid_subscription(
            user_id=db_payment.user_id,
            plan_id=ALL_INCLUSIVE_PLAN_ID,
            payment_id=db_payment.id,
            billing=db_payment.billing or "monthly",
        )
        logger.info(
            "Subscription activated for user %s via payment %s",
            db_payment.user_id,
            db_payment.id,
        )

    elif event.event == "payment.canceled" and yk_payment.status == "canceled":
        db_payment.status = "canceled"
        cancellation = getattr(yk_payment, "cancellation_details", None)
        if cancellation:
            db_payment.cancellation_reason = getattr(cancellation, "reason", None)

    await db.commit()
    return {"ok": True}
