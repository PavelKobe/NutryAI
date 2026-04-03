"""
SubscriptionService — бизнес-логика подписок и лимитов запросов к ИИ.
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from models.subscription import SubscriptionPlan, UserSubscription
from schemas.subscription import (
    SubscriptionPlanResponse,
    SubscriptionStatusResponse,
    UserSubscriptionResponse,
)
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

FREE_PLAN_ID = "plan_free_v1"
ALL_INCLUSIVE_PLAN_ID = "plan_all_inclusive_v1"


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    async def assign_free_plan(self, user_id: str) -> UserSubscription:
        """
        Назначает бесплатный тариф пользователю при регистрации.
        Идемпотентно: повторный вызов ничего не меняет (ON CONFLICT DO NOTHING).
        """
        now = datetime.now(tz=timezone.utc)
        expires_at = now + timedelta(days=7)
        sub_id = str(uuid.uuid4())

        await self.db.execute(
            text(
                """
                INSERT INTO user_subscriptions
                    (id, user_id, plan_id, status, started_at, expires_at,
                     ai_requests_today, requests_date)
                VALUES
                    (:id, :user_id, :plan_id, 'active', :started_at, :expires_at,
                     0, :requests_date)
                ON CONFLICT (user_id) DO NOTHING
                """
            ),
            {
                "id": sub_id,
                "user_id": user_id,
                "plan_id": FREE_PLAN_ID,
                "started_at": now,
                "expires_at": expires_at,
                "requests_date": now.date(),
            },
        )
        await self.db.commit()

        result = await self.db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        return result.scalar_one()

    async def check_and_increment_ai_request(self, user_id: str) -> None:
        """
        Проверяет и инкрементирует счётчик AI-запросов.

        Raises:
            HTTP 429 с detail.error == 'trial_expired'       — Free план истёк
            HTTP 429 с detail.error == 'daily_limit_exceeded' — дневной лимит исчерпан
            HTTP 403 с detail.error == 'no_subscription'      — подписка не найдена
        """
        today = date.today()

        # Получаем подписку и план одним запросом
        result = await self.db.execute(
            select(UserSubscription, SubscriptionPlan)
            .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
            .where(UserSubscription.user_id == user_id)
        )
        row = result.first()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "no_subscription", "message": "Подписка не найдена."},
            )

        sub, plan = row

        # Сброс дневного счётчика если наступил новый день
        if sub.requests_date < today:
            await self.db.execute(
                update(UserSubscription)
                .where(UserSubscription.user_id == user_id)
                .values(ai_requests_today=0, requests_date=today)
            )
            await self.db.flush()
            sub.ai_requests_today = 0
            sub.requests_date = today

        # Проверка срока действия Free-плана
        if sub.plan_id == FREE_PLAN_ID and sub.expires_at is not None:
            now = datetime.now(tz=timezone.utc)
            if now > sub.expires_at:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "trial_expired",
                        "message": "Пробный период завершён. Оформите подписку для продолжения.",
                    },
                )

        # Проверка дневного лимита
        if sub.ai_requests_today >= plan.daily_ai_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "daily_limit_exceeded",
                    "message": f"Дневной лимит запросов исчерпан ({plan.daily_ai_limit}/день).",
                },
            )

        # Атомарный инкремент
        await self.db.execute(
            update(UserSubscription)
            .where(UserSubscription.user_id == user_id)
            .values(ai_requests_today=UserSubscription.ai_requests_today + 1)
        )
        await self.db.commit()

    async def get_subscription_status(self, user_id: str) -> SubscriptionStatusResponse:
        """Возвращает текущую подписку пользователя и список всех доступных планов."""
        result = await self.db.execute(
            select(UserSubscription, SubscriptionPlan)
            .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
            .where(UserSubscription.user_id == user_id)
        )
        row = result.first()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "no_subscription", "message": "Подписка не найдена."},
            )

        sub, plan = row
        is_expired = self._compute_is_expired(sub)

        sub_response = UserSubscriptionResponse(
            plan_id=sub.plan_id,
            plan_name=plan.name,
            status=sub.status,
            started_at=sub.started_at,
            expires_at=sub.expires_at,
            ai_requests_today=sub.ai_requests_today,
            daily_ai_limit=plan.daily_ai_limit,
            requests_date=sub.requests_date,
            is_expired=is_expired,
        )

        plans = await self.get_all_plans()

        return SubscriptionStatusResponse(subscription=sub_response, plans=plans)

    async def get_all_plans(self) -> list[SubscriptionPlanResponse]:
        result = await self.db.execute(select(SubscriptionPlan))
        plans = result.scalars().all()
        return [
            SubscriptionPlanResponse(
                id=p.id,
                name=p.name,
                price_monthly=p.price_monthly,
                price_yearly=p.price_yearly,
                daily_ai_limit=p.daily_ai_limit,
                trial_days=p.trial_days,
            )
            for p in plans
        ]

    async def activate_paid_subscription(
        self,
        user_id: str,
        plan_id: str,
        payment_id: str,
        billing: str,  # "monthly" | "yearly"
    ) -> UserSubscription:
        """
        Активирует платную подписку после успешного платежа YooKassa.
        Обновляет существующую строку или создаёт новую.
        expires_at = NULL — платная подписка не имеет даты истечения
        (продление обрабатывается через вебхук при повторном платеже).
        """
        now = datetime.now(tz=timezone.utc)

        result = await self.db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        sub = result.scalar_one_or_none()

        if sub is not None:
            await self.db.execute(
                update(UserSubscription)
                .where(UserSubscription.user_id == user_id)
                .values(
                    plan_id=plan_id,
                    status="active",
                    started_at=now,
                    expires_at=None,
                    ai_requests_today=0,
                    requests_date=now.date(),
                    payment_id=payment_id,
                )
            )
        else:
            sub_id = str(uuid.uuid4())
            await self.db.execute(
                text(
                    """
                    INSERT INTO user_subscriptions
                        (id, user_id, plan_id, status, started_at, expires_at,
                         ai_requests_today, requests_date, payment_id)
                    VALUES
                        (:id, :user_id, :plan_id, 'active', :started_at, NULL,
                         0, :requests_date, :payment_id)
                    """
                ),
                {
                    "id": sub_id,
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "started_at": now,
                    "requests_date": now.date(),
                    "payment_id": payment_id,
                },
            )

        await self.db.commit()

        result = await self.db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        return result.scalar_one()

    # ──────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _compute_is_expired(sub: UserSubscription) -> bool:
        if sub.expires_at is None:
            return False
        return datetime.now(tz=timezone.utc) > sub.expires_at
