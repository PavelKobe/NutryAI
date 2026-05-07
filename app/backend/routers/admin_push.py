"""
Admin push notifications router — те же эндпоинты, но защищены get_admin_user.

  GET  /api/v1/admin/push/vapid-public-key
  POST /api/v1/admin/push/subscribe
  POST /api/v1/admin/push/unsubscribe
  GET  /api/v1/admin/push/unread-counts          — общий счётчик от всех клиентов
  POST /api/v1/admin/push/coaching/mark-read     — body {client_id?: str}
  POST /api/v1/admin/push/test
"""

import logging

from core.config import settings
from core.database import get_db
from dependencies.auth import get_admin_user
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

router = APIRouter(prefix="/api/v1/admin/push", tags=["admin-push"])
logger = logging.getLogger(__name__)


@router.get("/vapid-public-key", response_model=WebPushKeysOut)
async def admin_get_vapid_public_key(
    _admin: UserResponse = Depends(get_admin_user),
):
    pub = getattr(settings, "vapid_public_key", None)
    if not pub:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VAPID public key not configured",
        )
    return WebPushKeysOut(public_key=pub)


@router.post("/subscribe", response_model=PushSubscriptionOut)
async def admin_subscribe(
    body: PushSubscriptionIn,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    sub = await svc.register_subscription(
        user_id=admin.id,
        endpoint=body.endpoint,
        p256dh_key=body.keys.p256dh,
        auth_key=body.keys.auth,
        user_agent=body.user_agent,
    )
    return PushSubscriptionOut(endpoint=sub.endpoint, created_at=sub.created_at)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def admin_unsubscribe(
    body: PushUnsubscribeIn,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    await svc.unregister_subscription(admin.id, body.endpoint)
    return None


@router.get("/unread-counts", response_model=UnreadCountsOut)
async def admin_unread_counts(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    n = await svc.count_unread_for_admin()
    return UnreadCountsOut(coaching_unread=n)


@router.post("/coaching/mark-read", response_model=CoachingMarkReadOut)
async def admin_coaching_mark_read(
    body: CoachingMarkReadIn = CoachingMarkReadIn(),
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    n = await svc.mark_read_for_admin(client_id=body.client_id)
    return CoachingMarkReadOut(updated=n)


@router.post("/test", response_model=PushSendCountOut)
async def admin_push_test(
    body: PushTestIn,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PushService(db)
    payload = {
        "title": body.title or "NutryAI Admin Test",
        "body": body.body or "Тестовое уведомление",
        "icon": "/icons/icon-192x192.png",
        "badge": "/icons/icon-192x192.png",
        "tag": "test",
        "data": {"type": "test", "url": "/admin/coaching"},
    }
    sent = await svc.send_to_user(admin.id, payload)
    return PushSendCountOut(sent=sent)
