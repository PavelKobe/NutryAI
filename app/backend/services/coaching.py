"""
CoachingService — бизнес-логика услуги «Личное сопровождение нутрициолога».
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from models.coaching import CoachingMessage, CoachingPlan, CoachingSubscription
from schemas.coaching import (
    CoachingMessageOut,
    CoachingPlanResponse,
    CoachingStatusResponse,
)
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

COACHING_PLAN_ID = "coaching_v1"


class CoachingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Plan ───────────────────────────────────────────────────────────────

    async def get_plan(self) -> CoachingPlan:
        result = await self.db.execute(
            select(CoachingPlan).where(CoachingPlan.id == COACHING_PLAN_ID)
        )
        plan = result.scalar_one_or_none()
        if plan is None:
            logger.error("Coaching plan %s is missing in DB", COACHING_PLAN_ID)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Coaching plan is not configured",
            )
        return plan

    # ── Subscription ──────────────────────────────────────────────────────

    async def get_active_subscription(
        self, user_id: str
    ) -> Optional[CoachingSubscription]:
        """Текущая активная подписка (status='active' AND expires_at > now())."""
        now = datetime.now(tz=timezone.utc)
        result = await self.db.execute(
            select(CoachingSubscription)
            .where(
                CoachingSubscription.user_id == user_id,
                CoachingSubscription.status == "active",
                CoachingSubscription.expires_at > now,
            )
            .order_by(desc(CoachingSubscription.expires_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_subscription(
        self, user_id: str
    ) -> Optional[CoachingSubscription]:
        """Последняя подписка вне зависимости от статуса (для отображения 'expired')."""
        result = await self.db.execute(
            select(CoachingSubscription)
            .where(CoachingSubscription.user_id == user_id)
            .order_by(desc(CoachingSubscription.expires_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_status(self, user_id: str) -> CoachingStatusResponse:
        plan = await self.get_plan()
        plan_response = CoachingPlanResponse.model_validate(plan)

        active = await self.get_active_subscription(user_id)
        if active is not None:
            now = datetime.now(tz=timezone.utc)
            days_left = max(0, (active.expires_at - now).days)
            return CoachingStatusResponse(
                has_active=True,
                status="active",
                started_at=active.started_at,
                expires_at=active.expires_at,
                days_left=days_left,
                plan=plan_response,
            )

        latest = await self.get_latest_subscription(user_id)
        if latest is not None:
            return CoachingStatusResponse(
                has_active=False,
                status="expired",
                started_at=latest.started_at,
                expires_at=latest.expires_at,
                days_left=0,
                plan=plan_response,
            )

        return CoachingStatusResponse(
            has_active=False,
            status="none",
            days_left=0,
            plan=plan_response,
        )

    async def activate_or_extend(
        self,
        user_id: str,
        payment_id: Optional[str],
    ) -> CoachingSubscription:
        """
        Активирует или продлевает подписку клиента после успешной оплаты.

        Идемпотентно по payment_id: если строка с этим payment_id уже есть —
        возвращает её без изменений.

        Логика:
            * есть активная подписка (expires_at > now) → продлеваем expires_at += duration_days
            * нет активной → создаём новую строку (started_at=now, expires_at=now+duration_days)
        """
        if payment_id:
            existing = await self.db.execute(
                select(CoachingSubscription).where(
                    CoachingSubscription.payment_id == payment_id
                )
            )
            already = existing.scalar_one_or_none()
            if already is not None:
                logger.info(
                    "Coaching activation skipped (idempotent): payment %s already linked to subscription %s",
                    payment_id,
                    already.id,
                )
                return already

        plan = await self.get_plan()
        duration = timedelta(days=plan.duration_days)
        now = datetime.now(tz=timezone.utc)

        active = await self.get_active_subscription(user_id)
        if active is not None:
            new_expires = active.expires_at + duration
            await self.db.execute(
                update(CoachingSubscription)
                .where(CoachingSubscription.id == active.id)
                .values(
                    expires_at=new_expires,
                    payment_id=payment_id or active.payment_id,
                )
            )
            await self.db.commit()
            await self.db.refresh(active)
            logger.info(
                "Coaching subscription %s extended for user %s. New expires_at=%s",
                active.id,
                user_id,
                new_expires,
            )
            return active

        new_sub = CoachingSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan_id=plan.id,
            status="active",
            started_at=now,
            expires_at=now + duration,
            payment_id=payment_id,
        )
        self.db.add(new_sub)
        await self.db.commit()
        await self.db.refresh(new_sub)
        logger.info(
            "Coaching subscription created for user %s. expires_at=%s",
            user_id,
            new_sub.expires_at,
        )
        return new_sub

    async def admin_extend(self, user_id: str, days: int) -> CoachingSubscription:
        """Продлевает подписку клиента на N дней без оплаты (admin action).

        Если активной нет — создаёт новую. Если есть — продлевает.
        """
        if days <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days must be positive",
            )

        plan = await self.get_plan()
        now = datetime.now(tz=timezone.utc)

        active = await self.get_active_subscription(user_id)
        if active is not None:
            new_expires = active.expires_at + timedelta(days=days)
            await self.db.execute(
                update(CoachingSubscription)
                .where(CoachingSubscription.id == active.id)
                .values(expires_at=new_expires)
            )
            await self.db.commit()
            await self.db.refresh(active)
            return active

        new_sub = CoachingSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan_id=plan.id,
            status="active",
            started_at=now,
            expires_at=now + timedelta(days=days),
            payment_id=None,
        )
        self.db.add(new_sub)
        await self.db.commit()
        await self.db.refresh(new_sub)
        return new_sub

    # ── Messages ──────────────────────────────────────────────────────────

    async def list_messages(
        self,
        client_id: str,
        after_id: Optional[int] = None,
        limit: int = 200,
    ) -> list[CoachingMessage]:
        q = select(CoachingMessage).where(CoachingMessage.client_id == client_id)
        if after_id is not None and after_id > 0:
            q = q.where(CoachingMessage.id > after_id)
        q = q.order_by(CoachingMessage.id).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def send_message(
        self,
        client_id: str,
        sender_id: Optional[str],
        sender_role: str,
        content: str,
    ) -> CoachingMessage:
        """
        Отправка сообщения. Гейт: у клиента (client_id) должна быть активная подписка.
        Гейт симметричный — admin тоже не может писать клиенту, у которого подписка истекла.
        """
        if sender_role not in ("client", "nutritionist"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sender_role",
            )

        active = await self.get_active_subscription(client_id)
        if active is None:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "coaching_inactive",
                    "message": "Сопровождение неактивно. Продлите для отправки сообщений.",
                },
            )

        msg = CoachingMessage(
            client_id=client_id,
            sender_id=sender_id,
            sender_role=sender_role,
            content=content,
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def to_message_out(msg: CoachingMessage) -> CoachingMessageOut:
        return CoachingMessageOut(
            id=msg.id,
            sender_role=msg.sender_role,
            content=msg.content,
            created_at=msg.created_at,
        )
