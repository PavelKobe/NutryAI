from datetime import datetime, timezone
from typing import Optional

from core.database import get_db
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.payment import Payment
from schemas.admin import AdminPaymentListResponse, AdminPaymentOut
from schemas.auth import UserResponse
from services.yookassa_service import YooKassaService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin/payments", tags=["admin-payments"])


@router.get("", response_model=AdminPaymentListResponse)
async def list_payments(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = Query(None, max_length=255),
    status_filter: Optional[str] = Query(None, alias="status", max_length=32),
):
    q = select(Payment)
    count_q = select(func.count()).select_from(Payment)
    if user_id:
        q = q.where(Payment.user_id == user_id)
        count_q = count_q.where(Payment.user_id == user_id)
    if status_filter:
        q = q.where(Payment.status == status_filter)
        count_q = count_q.where(Payment.status == status_filter)

    total = int((await db.execute(count_q)).scalar_one())
    q = q.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return AdminPaymentListResponse(
        items=[AdminPaymentOut.model_validate(p) for p in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/{payment_id}/capture", response_model=AdminPaymentOut)
async def capture_payment(
    payment_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Захватывает двухстадийный платёж через YooKassa API."""
    row = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if row.status not in ("pending", "waiting_for_capture"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot capture payment in status {row.status!r}",
        )
    if not row.yookassa_payment_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment has no yookassa_payment_id",
        )
    try:
        yk_service = YooKassaService()
        await yk_service.capture_payment(row.yookassa_payment_id, row.amount_value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YooKassa capture failed: {exc}",
        ) from exc
    row.status = "succeeded"
    row.captured_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return AdminPaymentOut.model_validate(row)


@router.post("/{payment_id}/refund", response_model=AdminPaymentOut)
async def refund_payment(
    payment_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Создаёт возврат через YooKassa API."""
    row = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if row.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot refund payment in status {row.status!r}",
        )
    if not row.yookassa_payment_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment has no yookassa_payment_id",
        )
    try:
        yk_service = YooKassaService()
        await yk_service.create_refund(row.yookassa_payment_id, row.amount_value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YooKassa refund failed: {exc}",
        ) from exc
    row.status = "refunded"
    await db.commit()
    await db.refresh(row)
    return AdminPaymentOut.model_validate(row)


@router.get("/{payment_id}", response_model=AdminPaymentOut)
async def get_payment(
    payment_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return AdminPaymentOut.model_validate(row)
