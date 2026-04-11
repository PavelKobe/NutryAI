import logging
from datetime import time as dt_time
from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)

MEAL_NAMES = {
    "завтрак": ("breakfast", dt_time(8, 0)),
    "обед": ("lunch", dt_time(13, 0)),
    "ужин": ("dinner", dt_time(19, 0)),
}


async def remind_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/remind обед 13:00 — настроить напоминание."""
    args = context.args

    if not args:
        current = context.user_data.get("reminders", {})
        if not current:
            await update.message.reply_text(
                "У вас нет напоминаний.\n\n"
                "Настройте: /remind завтрак 8:00\n"
                "Доступные приёмы: завтрак, обед, ужин\n"
                "Отключить: /remind выкл"
            )
        else:
            lines = [f"  {name}: {t}" for name, t in current.items()]
            await update.message.reply_text("Ваши напоминания:\n" + "\n".join(lines))
        return

    # /remind выкл — отключить все
    if args[0].lower() in ("выкл", "off", "стоп"):
        jobs = context.job_queue.get_jobs_by_name(f"remind_{update.effective_user.id}")
        for job in jobs:
            job.schedule_removal()
        context.user_data["reminders"] = {}
        await update.message.reply_text("Все напоминания отключены.")
        return

    meal_name = args[0].lower()
    if meal_name not in MEAL_NAMES:
        await update.message.reply_text(
            f"Неизвестный приём пищи: {meal_name}\n"
            "Доступные: завтрак, обед, ужин"
        )
        return

    # Время
    if len(args) >= 2:
        try:
            parts = args[1].replace(".", ":").split(":")
            hour, minute = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            reminder_time = dt_time(hour, minute)
        except (ValueError, IndexError):
            await update.message.reply_text("Неверный формат времени. Пример: /remind обед 13:00")
            return
    else:
        _, reminder_time = MEAL_NAMES[meal_name]

    # Удалить старое напоминание для этого приёма
    job_name = f"remind_{update.effective_user.id}_{meal_name}"
    jobs = context.job_queue.get_jobs_by_name(job_name)
    for job in jobs:
        job.schedule_removal()

    # Создать новое
    context.job_queue.run_daily(
        _send_reminder,
        time=reminder_time,
        chat_id=update.effective_chat.id,
        name=job_name,
        data={"meal_name": meal_name},
    )

    # Сохранить в user_data
    reminders = context.user_data.setdefault("reminders", {})
    reminders[meal_name] = f"{reminder_time.hour:02d}:{reminder_time.minute:02d}"

    await update.message.reply_text(
        f"⏰ Напоминание о {meal_name}е в {reminders[meal_name]} настроено!"
    )


async def _send_reminder(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправка напоминания."""
    meal_name = context.job.data.get("meal_name", "приём пищи")
    messages = {
        "завтрак": "Доброе утро! Время завтрака. Что вы ели? Напишите или отправьте фото.",
        "обед": "Время обеда! Что вы ели? Напишите или отправьте фото.",
        "ужин": "Время ужина! Что вы ели? Напишите или отправьте фото.",
    }
    text = messages.get(meal_name, f"Время {meal_name}а! Что вы ели?")
    await context.bot.send_message(chat_id=context.job.chat_id, text=f"🔔 {text}")
