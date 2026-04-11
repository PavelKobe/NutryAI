import os
from core.config import settings

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", getattr(settings, "telegram_bot_token", ""))

# AI model for food parsing (text)
FOOD_PARSE_MODEL = "openai/gpt-4o-mini"

# AI model for photo recognition (multimodal)
PHOTO_PARSE_MODEL = "google/gemini-2.5-flash-preview"

FOOD_SYSTEM_PROMPT = """Ты профессиональный нутрициолог. Пользователь описал приём пищи.
Определи каждый продукт, его порцию и пищевую ценность.

Верни ТОЛЬКО валидный JSON массив (без markdown, без ```json):
[{
  "food_name": "название продукта",
  "portion_grams": число,
  "calories": число,
  "protein": число,
  "fat": число,
  "carbs": число,
  "meal_type": "breakfast|lunch|dinner|snack"
}]

Правила определения meal_type по московскому времени:
- до 11:00 — breakfast
- 11:00-15:00 — lunch
- 15:00-18:00 — snack
- после 18:00 — dinner

Если порция не указана, используй стандартную порцию для этого продукта.
Все числовые значения — числа (не строки)."""

PHOTO_SYSTEM_PROMPT = """Ты профессиональный нутрициолог. На фото — приём пищи.
Определи все блюда/продукты, их примерные порции и пищевую ценность.

Верни ТОЛЬКО валидный JSON массив (без markdown, без ```json):
[{
  "food_name": "название блюда/продукта",
  "portion_grams": число,
  "calories": число,
  "protein": число,
  "fat": число,
  "carbs": число,
  "meal_type": "breakfast|lunch|dinner|snack"
}]

Все числовые значения — числа (не строки).
Оценивай порции визуально по размеру тарелки и объёму еды."""
