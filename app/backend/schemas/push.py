"""Pydantic schemas for Web Push notifications."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: Optional[str] = Field(None, max_length=512)


class PushUnsubscribeIn(BaseModel):
    endpoint: str


class PushSubscriptionOut(BaseModel):
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True


class WebPushKeysOut(BaseModel):
    """VAPID public key для клиентского pushManager.subscribe()."""

    public_key: str


class UnreadCountsOut(BaseModel):
    coaching_unread: int = 0


class CoachingMarkReadIn(BaseModel):
    """Опциональный client_id для админа (если не указан — отметит все)."""

    client_id: Optional[str] = None


class CoachingMarkReadOut(BaseModel):
    updated: int = 0


class PushTestIn(BaseModel):
    title: Optional[str] = "NutryAI Test"
    body: Optional[str] = "Тестовое уведомление"


class PushSendCountOut(BaseModel):
    sent: int = 0
