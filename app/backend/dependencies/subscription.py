"""
Dependency для проверки подписки и лимита AI-запросов.
"""

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.subscription import SubscriptionService
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import Depends


async def check_ai_subscription(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Dependency для эндпоинтов AI.
    1. Требует авторизованного пользователя (через get_current_user).
    2. Проверяет наличие активной подписки.
    3. Проверяет дневной лимит и срок действия.
    4. Атомарно инкрементирует счётчик запросов.

    Raises HTTP 429 если лимит исчерпан или пробный период завершён.
    """
    service = SubscriptionService(db)
    await service.check_and_increment_ai_request(current_user.id)
    return current_user
