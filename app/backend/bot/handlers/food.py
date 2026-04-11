import logging
from datetime import datetime, timezone
from telegram import Update
from telegram.ext import ContextTypes
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id
from bot.services.food_parser import parse_food_text
from services.meal_logs import Meal_logsService

logger = logging.getLogger(__name__)


async def food_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка текстовых сообщений — парсинг еды через AI."""
    if context.user_data.get("awaiting_email"):
        return  # Ждём email, не парсим как еду

    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text(
            "Сначала привяжите аккаунт — отправьте /start"
        )
        return

    text = update.message.text.strip()
    if not text:
        return

    processing_msg = await update.message.reply_text("Анализирую...")

    try:
        items = await parse_food_text(text)
    except Exception as e:
        logger.error(f"Food parse error: {e}", exc_info=True)
        await processing_msg.edit_text("Не удалось распознать еду. Попробуйте описать иначе.")
        return

    if not items:
        await processing_msg.edit_text("Не удалось определить продукты. Попробуйте описать подробнее.")
        return

    # Записать каждый продукт
    async with db_manager.async_session_maker() as session:
        service = Meal_logsService(session)
        for item in items:
            item["logged_at"] = datetime.now(timezone.utc).isoformat()
            await service.create(item, user_id=user.id)

    # Собрать сводку
    lines = []
    total_cal = 0
    for item in items:
        cal = int(item["calories"])
        total_cal += cal
        lines.append(
            f"  {item['food_name']} {item['portion_grams']}г — {cal} ккал "
            f"(Б:{int(item['protein'])} Ж:{int(item['fat'])} У:{int(item['carbs'])})"
        )

    reply = "✅ Записано!\n" + "\n".join(lines)
    if len(items) > 1:
        reply += f"\n\nИтого: {total_cal} ккал"

    await processing_msg.edit_text(reply)
