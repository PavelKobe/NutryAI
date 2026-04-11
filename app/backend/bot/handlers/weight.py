import logging
from datetime import datetime, timezone
from telegram import Update
from telegram.ext import ContextTypes
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id
from services.weight_logs import Weight_logsService

logger = logging.getLogger(__name__)


async def weight_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/weight 75.2 — записать вес."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text("Сначала привяжите аккаунт — /start")
        return

    args = context.args
    if not args:
        await update.message.reply_text("Укажите вес. Пример: /weight 75.2")
        return

    try:
        weight = float(args[0].replace(",", "."))
    except ValueError:
        await update.message.reply_text("Укажите число. Пример: /weight 75.2")
        return

    if weight < 20 or weight > 300:
        await update.message.reply_text("Укажите реальный вес (20-300 кг).")
        return

    async with db_manager.async_session_maker() as session:
        service = Weight_logsService(session)
        await service.create(
            {"weight_kg": weight, "logged_at": datetime.now(timezone.utc).isoformat()},
            user_id=user.id,
        )

    await update.message.reply_text(f"⚖️ Вес {weight} кг записан!")
