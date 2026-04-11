import logging
from telegram import Update
from telegram.ext import ContextTypes
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id, link_telegram_to_user

logger = logging.getLogger(__name__)


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка /start — приветствие и привязка аккаунта."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if user:
        await update.message.reply_text(
            f"Привет, {user.name or user.email}! Ваш аккаунт привязан.\n\n"
            "Просто напишите что вы съели или отправьте фото еды.\n"
            "Команды: /today /water /weight /stats /remind /help"
        )
    else:
        await update.message.reply_text(
            "Привет! Я бот NutriAI Diary.\n\n"
            "Чтобы начать, отправьте email вашего аккаунта на nutriaidiary.com.\n"
            "Если у вас ещё нет аккаунта, зарегистрируйтесь на сайте."
        )
        context.user_data["awaiting_email"] = True


async def email_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка email для привязки аккаунта."""
    if not context.user_data.get("awaiting_email"):
        return

    email = update.message.text.strip()
    if "@" not in email or "." not in email:
        return  # Не email — пропускаем, пусть обработает food handler

    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await link_telegram_to_user(session, email, tg_id)

    if user:
        context.user_data["awaiting_email"] = False
        await update.message.reply_text(
            f"Аккаунт {user.email} привязан!\n\n"
            "Теперь просто пишите что вы съели, или отправьте фото еды.\n"
            "Команды: /today /water /weight /stats /remind /help"
        )
    else:
        await update.message.reply_text(
            "Аккаунт с таким email не найден.\n"
            "Проверьте email или зарегистрируйтесь на nutriaidiary.com"
        )
