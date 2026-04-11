import logging
from datetime import datetime, timezone, timedelta
from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy import select
from core.database import db_manager
from bot.services.user_link import get_user_by_telegram_id
from models.meal_logs import Meal_logs
from models.water_logs import Water_logs

logger = logging.getLogger(__name__)


async def today_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/today — сводка за сегодня."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text("Сначала привяжите аккаунт — /start")
        return

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async with db_manager.async_session_maker() as session:
        # Meal logs
        result = await session.execute(
            select(Meal_logs).where(
                Meal_logs.user_id == user.id,
                Meal_logs.logged_at >= today_start,
            )
        )
        meals = result.scalars().all()

        # Water logs
        result = await session.execute(
            select(Water_logs).where(
                Water_logs.user_id == user.id,
                Water_logs.logged_at >= today_start,
            )
        )
        waters = result.scalars().all()

    total_cal = sum(m.calories or 0 for m in meals)
    total_protein = sum(m.protein or 0 for m in meals)
    total_fat = sum(m.fat or 0 for m in meals)
    total_carbs = sum(m.carbs or 0 for m in meals)
    total_water = sum(w.amount_ml or 0 for w in waters)

    text = (
        f"📊 Сегодня ({now.strftime('%d.%m.%Y')}):\n\n"
        f"🔥 Калории: {int(total_cal)} ккал\n"
        f"🥩 Белки: {int(total_protein)} г\n"
        f"🧈 Жиры: {int(total_fat)} г\n"
        f"🌾 Углеводы: {int(total_carbs)} г\n"
        f"💧 Вода: {total_water} мл\n"
        f"🍽 Приёмов пищи: {len(meals)}"
    )

    await update.message.reply_text(text)


async def stats_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/stats — недельная статистика."""
    tg_id = update.effective_user.id

    async with db_manager.async_session_maker() as session:
        user = await get_user_by_telegram_id(session, tg_id)

    if not user:
        await update.message.reply_text("Сначала привяжите аккаунт — /start")
        return

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    async with db_manager.async_session_maker() as session:
        result = await session.execute(
            select(Meal_logs).where(
                Meal_logs.user_id == user.id,
                Meal_logs.logged_at >= week_ago,
            )
        )
        meals = result.scalars().all()

    if not meals:
        await update.message.reply_text("Нет данных за последние 7 дней.")
        return

    # Группировка по дням
    days: dict[str, dict] = {}
    for m in meals:
        day = m.logged_at.strftime("%Y-%m-%d") if m.logged_at else "unknown"
        if day not in days:
            days[day] = {"cal": 0, "p": 0, "f": 0, "c": 0}
        days[day]["cal"] += m.calories or 0
        days[day]["p"] += m.protein or 0
        days[day]["f"] += m.fat or 0
        days[day]["c"] += m.carbs or 0

    n = len(days)
    avg_cal = sum(d["cal"] for d in days.values()) / n
    avg_p = sum(d["p"] for d in days.values()) / n
    avg_f = sum(d["f"] for d in days.values()) / n
    avg_c = sum(d["c"] for d in days.values()) / n

    text = (
        f"📈 Статистика за 7 дней:\n\n"
        f"Дней с записями: {n} из 7\n\n"
        f"Средние показатели в день:\n"
        f"🔥 Калории: {int(avg_cal)} ккал\n"
        f"🥩 Белки: {int(avg_p)} г\n"
        f"🧈 Жиры: {int(avg_f)} г\n"
        f"🌾 Углеводы: {int(avg_c)} г"
    )

    await update.message.reply_text(text)
