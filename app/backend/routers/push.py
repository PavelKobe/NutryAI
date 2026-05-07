"""
Push notifications router — пользовательские эндпоинты Web Push.

  GET  /api/v1/push/vapid-public-key   — VAPID public key для pushManager.subscribe
  POST /api/v1/push/subscribe          — upsert подписки текущего юзера
  POST /api/v1/push/unsubscribe        — удалить подписку по endpoint
  GET  /api/v1/push/unread-counts      — счётчик непрочитанных coaching-сообщений
  POST /api/v1/push/coaching/mark-read — пометить coaching как прочитанные
  POST /api/v1/push/test               — тестовый push на свои подписки
"""

import logging

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from schemas.auth import UserResponse
from schemas.push import (
    CoachingMarkReadIn,
    CoachingMarkReadOut,
    PushSendCountOut,
    PushSubscriptionIn,
    PushSubscriptionOut,
    PushTestIn,
    PushUnsubscribeIn,
    UnreadCountsOut,
    WebPushKeysOut,
)
from services.push_service import PushService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/push", tags=["push"])
logger = logging.getLogger(__name__)


@router.get("/vapid-public-key", response_model=WebPushKeysOut)
async def get_vapid_public_key(
    _user: UserResponse = Depends(get_current_user),
):
    pub = getattr(settings, "vapid_public_key", None)
    if not pub:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VAPID public key not configured",
        )
    return WebPushKeysOut(public_key=pub)


@router.post("/subscribe", response_model=PushSubscriptionOut)
async def subscribe(
    body: PushSubscriptionIn,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    sub = await svc.register_subscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh_key=body.keys.p256dh,
        auth_key=body.keys.auth,
        user_agent=body.user_agent,
    )
    return PushSubscriptionOut(endpoint=sub.endpoint, created_at=sub.created_at)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    body: PushUnsubscribeIn,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    await svc.unregister_subscription(current_user.id, body.endpoint)
    return None


@router.get("/unread-counts", response_model=UnreadCountsOut)
async def unread_counts(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    n = await svc.count_unread_for_client(current_user.id)
    return UnreadCountsOut(coaching_unread=n)


@router.post("/coaching/mark-read", response_model=CoachingMarkReadOut)
async def coaching_mark_read(
    _body: CoachingMarkReadIn = CoachingMarkReadIn(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    n = await svc.mark_read_for_client(current_user.id)
    return CoachingMarkReadOut(updated=n)


@router.post("/test", response_model=PushSendCountOut)
async def push_test(
    body: PushTestIn,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    payload = {
        "title": body.title or "NutryAI Test",
        "body": body.body or "Тестовое уведомление",
        "icon": "/icons/icon-192x192.png",
        "badge": "/icons/icon-192x192.png",
        "tag": "test",
        "data": {"type": "test", "url": "/coaching/chat"},
    }
    sent = await svc.send_to_user(current_user.id, payload)
    return PushSendCountOut(sent=sent)
