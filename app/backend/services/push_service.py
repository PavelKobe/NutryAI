"""
PushService — Web Push API через VAPID + pywebpush.

Хранит подписки в push_subscriptions и шлёт пуш-уведомления списку user_id.
Также отвечает за подсчёт и сброс непрочитанных coaching-сообщений.

`_push_send_safe` — top-level coroutine для FastAPI BackgroundTasks. Открывает
свою AsyncSession (через db_manager.async_session_maker), потому что зависимостная
сессия закрывается до того, как BackgroundTasks начнёт выполнение.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from core.config import settings
from core.database import db_manager
from models.coaching import CoachingMessage
from models.auth import User
from models.push_subscription import PushSubscription
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Subscription management ─────────────────────────────────────────────

    async def register_subscription(
        self,
        user_id: str,
        endpoint: str,
        p256dh_key: str,
        auth_key: str,
        user_agent: Optional[str] = None,
    ) -> PushSubscription:
        """Upsert по endpoint:
        - если endpoint есть и принадлежит этому юзеру → обновляем keys + last_seen
        - если есть и юзер другой → перепривязываем к новому user_id
        - если нет → insert
        """
        now = datetime.now(tz=timezone.utc)

        result = await self.db.execute(
            select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        )
        existing = result.scalar_one_or_none()

        if existing is not None:
            existing.user_id = user_id
            existing.p256dh_key = p256dh_key
            existing.auth_key = auth_key
            if user_agent:
                existing.user_agent = user_agent
            existing.last_seen_at = now
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        sub = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh_key=p256dh_key,
            auth_key=auth_key,
            user_agent=user_agent,
            last_seen_at=now,
        )
        self.db.add(sub)
        await self.db.commit()
        await self.db.refresh(sub)
        return sub

    async def unregister_subscription(self, user_id: str, endpoint: str) -> int:
        """DELETE подписки. Возвращает количество удалённых строк."""
        result = await self.db.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
        )
        await self.db.commit()
        return int(result.rowcount or 0)

    async def list_user_subscriptions(
        self, user_id: str
    ) -> list[PushSubscription]:
        result = await self.db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        return list(result.scalars().all())

    async def list_admin_user_ids(self) -> list[str]:
        result = await self.db.execute(
            select(User.id).where(User.role == "admin", User.is_active.is_(True))
        )
        return [row[0] for row in result.all()]

    # ── Sending ─────────────────────────────────────────────────────────────

    async def send_to_user(
        self,
        user_id: str,
        payload: dict,
        ttl: int = 86400,
    ) -> int:
        """
        Шлёт push на ВСЕ подписки юзера.
        Возвращает количество удачных отправок.

        - 404/410 (Gone) → DELETE подписки
        - 413 → один retry с обрезанным body (60 симв.)
        - другие — log + continue
        """
        try:
            from pywebpush import WebPushException, webpush
        except ImportError:
            logger.error("pywebpush not installed — push notifications disabled")
            return 0

        vapid_private = getattr(settings, "vapid_private_key", None)
        vapid_subject = getattr(settings, "vapid_subject", None) or "mailto:admin@nutriaidiary.com"
        if not vapid_private:
            logger.warning(
                "VAPID_PRIVATE_KEY not configured — skipping push for user %s",
                user_id,
            )
            return 0

        subs = await self.list_user_subscriptions(user_id)
        if not subs:
            return 0

        sent = 0
        to_drop: list[int] = []
        now = datetime.now(tz=timezone.utc)

        for sub in subs:
            sub_info = {
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh_key, "auth": sub.auth_key},
            }
            data_str = json.dumps(payload, ensure_ascii=False)

            try:
                webpush(
                    subscription_info=sub_info,
                    data=data_str,
                    vapid_private_key=vapid_private,
                    vapid_claims={"sub": vapid_subject},
                    ttl=ttl,
                )
                sent += 1
                sub.last_seen_at = now
            except WebPushException as e:
                code = getattr(getattr(e, "response", None), "status_code", None)
                if code in (404, 410):
                    to_drop.append(sub.id)
                    logger.info(
                        "Dropping gone push subscription id=%s for user %s",
                        sub.id,
                        user_id,
                    )
                elif code == 413:
                    # Один retry с обрезанным body
                    short = dict(payload)
                    if isinstance(short.get("body"), str):
                        short["body"] = short["body"][:60]
                    try:
                        webpush(
                            subscription_info=sub_info,
                            data=json.dumps(short, ensure_ascii=False),
                            vapid_private_key=vapid_private,
                            vapid_claims={"sub": vapid_subject},
                            ttl=ttl,
                        )
                        sent += 1
                        sub.last_seen_at = now
                    except Exception:
                        logger.warning(
                            "Push 413 retry failed for sub %s", sub.id
                        )
                else:
                    logger.warning(
                        "webpush failed (code=%s) for endpoint %s: %s",
                        code,
                        sub.endpoint[:80],
                        e,
                    )
            except Exception as e:
                logger.warning("Unexpected push error for sub %s: %s", sub.id, e)

        if to_drop:
            await self.db.execute(
                delete(PushSubscription).where(PushSubscription.id.in_(to_drop))
            )
        await self.db.commit()
        return sent

    async def send_to_users(self, user_ids: list[str], payload: dict) -> int:
        total = 0
        for uid in user_ids:
            try:
                total += await self.send_to_user(uid, payload)
            except Exception:
                logger.exception("send_to_user failed for %s", uid)
        return total

    # ── Unread counters ─────────────────────────────────────────────────────

    async def count_unread_for_client(self, user_id: str) -> int:
        from sqlalchemy import func as sqlfunc

        result = await self.db.execute(
            select(sqlfunc.count())
            .select_from(CoachingMessage)
            .where(
                CoachingMessage.client_id == user_id,
                CoachingMessage.sender_role == "nutritionist",
                CoachingMessage.read_by_client_at.is_(None),
            )
        )
        return int(result.scalar_one() or 0)

    async def count_unread_for_admin(
        self, client_id: Optional[str] = None
    ) -> int:
        from sqlalchemy import func as sqlfunc

        q = select(sqlfunc.count()).select_from(CoachingMessage).where(
            CoachingMessage.sender_role == "client",
            CoachingMessage.read_by_nutritionist_at.is_(None),
        )
        if client_id is not None:
            q = q.where(CoachingMessage.client_id == client_id)

        result = await self.db.execute(q)
        return int(result.scalar_one() or 0)

    async def mark_read_for_client(self, user_id: str) -> int:
        now = datetime.now(tz=timezone.utc)
        result = await self.db.execute(
            update(CoachingMessage)
            .where(
                CoachingMessage.client_id == user_id,
                CoachingMessage.sender_role == "nutritionist",
                CoachingMessage.read_by_client_at.is_(None),
            )
            .values(read_by_client_at=now)
        )
        await self.db.commit()
        return int(result.rowcount or 0)

    async def mark_read_for_admin(
        self, client_id: Optional[str] = None
    ) -> int:
        now = datetime.now(tz=timezone.utc)
        q = update(CoachingMessage).where(
            CoachingMessage.sender_role == "client",
            CoachingMessage.read_by_nutritionist_at.is_(None),
        )
        if client_id is not None:
            q = q.where(CoachingMessage.client_id == client_id)
        q = q.values(read_by_nutritionist_at=now)

        result = await self.db.execute(q)
        await self.db.commit()
        return int(result.rowcount or 0)


# ── BackgroundTasks helper ──────────────────────────────────────────────────


async def _push_send_safe(user_ids: list[str], payload: dict) -> None:
    """
    Запускается из FastAPI BackgroundTasks.

    Нельзя переиспользовать сессию из роута — она уже закрыта. Открываем
    свою через `db_manager.async_session_maker`.
    """
    if not user_ids:
        return
    if db_manager.async_session_maker is None:
        try:
            await db_manager.ensure_initialized()
        except Exception:
            logger.exception("Failed to initialize DB for push background task")
            return
    if db_manager.async_session_maker is None:
        return

    try:
        async with db_manager.async_session_maker() as session:
            svc = PushService(session)
            for uid in user_ids:
                try:
                    await svc.send_to_user(uid, payload)
                except Exception:
                    logger.exception("push fanout failed for user %s", uid)
    except Exception:
        logger.exception("push background task crashed")
