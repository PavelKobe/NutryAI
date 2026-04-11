"""
NutriAI Diary Telegram Bot.
Запуск: python -m bot.main
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path (for imports like core.*, services.*, models.*)
backend_root = str(Path(__file__).resolve().parent.parent)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from dotenv import load_dotenv

# Load env files (same pattern as main.py)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
env_dev = Path(__file__).resolve().parent.parent / ".env_development"
if env_dev.exists() and os.environ.get("ENVIRONMENT") != "prod":
    load_dotenv(env_dev, override=True)

from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from core.database import db_manager
from bot.config import TELEGRAM_BOT_TOKEN
from bot.handlers.start import start_handler, email_handler
from bot.handlers.food import food_handler
from bot.handlers.photo import photo_handler, food_callback_handler
from bot.handlers.water import water_handler
from bot.handlers.weight import weight_handler
from bot.handlers.stats import today_handler, stats_handler
from bot.handlers.reminders import remind_handler

logging.basicConfig(
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def help_handler(update, context):
    await update.message.reply_text(
        "📋 Команды:\n\n"
        "Просто напишите что вы съели — я запишу КБЖУ\n"
        "Отправьте фото еды — я распознаю и запишу\n\n"
        "/today — сводка за сегодня\n"
        "/stats — статистика за неделю\n"
        "/water 500 — записать воду (мл)\n"
        "/weight 75.2 — записать вес (кг)\n"
        "/remind — настроить напоминания\n"
        "/help — эта справка"
    )


async def post_init(application):
    """Инициализация БД при старте бота."""
    await db_manager.init_db()
    logger.info("Database initialized")


async def post_shutdown(application):
    """Закрытие БД при остановке бота."""
    await db_manager.close_db()
    logger.info("Database closed")


def main():
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set. Set it in .env or environment.")
        sys.exit(1)

    app = (
        ApplicationBuilder()
        .token(TELEGRAM_BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    # Commands
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("help", help_handler))
    app.add_handler(CommandHandler("today", today_handler))
    app.add_handler(CommandHandler("stats", stats_handler))
    app.add_handler(CommandHandler("water", water_handler))
    app.add_handler(CommandHandler("weight", weight_handler))
    app.add_handler(CommandHandler("remind", remind_handler))

    # Callbacks (inline buttons)
    app.add_handler(CallbackQueryHandler(food_callback_handler, pattern="^(save_food|cancel_food)$"))

    # Photo messages
    app.add_handler(MessageHandler(filters.PHOTO, photo_handler))

    # Text messages (email linking has priority, then food parsing)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, email_handler), group=0)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, food_handler), group=1)

    logger.info("Starting NutriAI Telegram bot (polling mode)...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
