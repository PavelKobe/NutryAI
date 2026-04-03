"""
Subscription router — эндпоинты для управления подпиской пользователя.
"""

import logging

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends
from schemas.auth import UserResponse
from schemas.subscription import SubscriptionPlanResponse, SubscriptionStatusResponse
from services.subscription import SubscriptionService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/subscription", tags=["subscription"])
logger = logging.getLogger(__name__)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает текущую подписку пользователя и список всех доступных тарифов.
    Используется в профиле и для отображения лимитов.
    """
    service = SubscriptionService(db)
    return await service.get_subscription_status(current_user.id)


@router.get("/plans", response_model=list[SubscriptionPlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    """
    Публичный эндпоинт: список всех доступных тарифных планов.
    Используется на странице выбора тарифа.
    """
    service = SubscriptionService(db)
    return await service.get_all_plans()
