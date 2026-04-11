import logging
from datetime import datetime, UTC
from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy import select, func
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id
from models.base import Base
from services.water_logs import Water_logsService

logger = logging.getLogger(__name__)


async def water_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/water 500 — записать воду."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text("Сначала привяжите аккаунт — /start")
        return

    args = context.args
    if not args:
        await update.message.reply_text("Укажите количество мл. Пример: /water 500")
        return

    try:
        amount = int(args[0])
    except ValueError:
        await update.message.reply_text("Укажите число. Пример: /water 500")
        return

    if amount <= 0 or amount > 5000:
        await update.message.reply_text("Укажите от 1 до 5000 мл.")
        return

    async with db_manager.async_session_maker() as session:
        service = Water_logsService(session)
        await service.create(
            {"amount_ml": amount, "logged_at": datetime.now(UTC)},
            user_id=user.id,
        )

    await update.message.reply_text(f"💧 {amount} мл воды записано!")
