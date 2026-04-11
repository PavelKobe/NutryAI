import logging
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id
from bot.services.food_parser import parse_food_photo
from services.meal_logs import Meal_logsService

logger = logging.getLogger(__name__)


async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка фото — распознавание еды через AI vision."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text("Сначала привяжите аккаунт — отправьте /start")
        return

    processing_msg = await update.message.reply_text("Распознаю еду на фото...")

    # Скачать фото (самое большое разрешение)
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    photo_bytes = await file.download_as_bytearray()

    try:
        items = await parse_food_photo(bytes(photo_bytes))
    except Exception as e:
        logger.error(f"Photo parse error: {e}", exc_info=True)
        await processing_msg.edit_text("Не удалось распознать еду на фото. Попробуйте другое фото или опишите текстом.")
        return

    if not items:
        await processing_msg.edit_text("Не удалось определить еду на фото.")
        return

    # Сохранить для callback
    context.user_data["pending_food"] = items

    # Показать результат с кнопками
    lines = []
    total_cal = 0
    for item in items:
        cal = int(item["calories"])
        total_cal += cal
        lines.append(
            f"  {item['food_name']} {item['portion_grams']}г — {cal} ккал "
            f"(Б:{int(item['protein'])} Ж:{int(item['fat'])} У:{int(item['carbs'])})"
        )

    text = "🍽 Вижу:\n" + "\n".join(lines)
    if len(items) > 1:
        text += f"\n\nИтого: {total_cal} ккал"

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Записать", callback_data="save_food"),
            InlineKeyboardButton("❌ Отмена", callback_data="cancel_food"),
        ]
    ])

    await processing_msg.edit_text(text, reply_markup=keyboard)


async def food_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка кнопок Записать/Отмена после распознавания фото."""
    query = update.callback_query
    await query.answer()

    if query.data == "cancel_food":
        context.user_data.pop("pending_food", None)
        await query.edit_message_text("Отменено.")
        return

    if query.data != "save_food":
        return

    items = context.user_data.pop("pending_food", None)
    if not items:
        await query.edit_message_text("Данные устарели. Отправьте фото заново.")
        return

    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)
        if not user:
            await query.edit_message_text("Аккаунт не привязан.")
            return

        service = Meal_logsService(session)
        for item in items:
            item["logged_at"] = datetime.now(timezone.utc).isoformat()
            await service.create(item, user_id=user.id)

    total = sum(int(i["calories"]) for i in items)
    await query.edit_message_text(f"✅ Записано! ({total} ккал)")
