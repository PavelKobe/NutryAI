import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from models.auth import User

logger = logging.getLogger(__name__)


async def get_user_by_telegram_id(session: AsyncSession, telegram_user_id: int) -> User | None:
    """Найти пользователя по Telegram ID."""
    result = await session.execute(
        select(User).where(User.telegram_user_id == str(telegram_user_id))
    )
    return result.scalar_one_or_none()


async def link_telegram_to_user(session: AsyncSession, email: str, telegram_user_id: int) -> User | None:
    """Привязать Telegram ID к пользователю по email."""
    result = await session.execute(
        select(User).where(User.email == email.lower().strip())
    )
    user = result.scalar_one_or_none()
    if not user:
        return None

    # Проверить, не привязан ли уже другой Telegram
    if user.telegram_user_id and user.telegram_user_id != str(telegram_user_id):
        logger.warning(f"User {user.id} already linked to different Telegram ID")

    await session.execute(
        update(User)
        .where(User.id == user.id)
        .values(telegram_user_id=str(telegram_user_id))
    )
    await session.commit()
    logger.info(f"Linked Telegram {telegram_user_id} to user {user.id} ({user.email})")
    return user
