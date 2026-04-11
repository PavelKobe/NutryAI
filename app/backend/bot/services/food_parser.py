import base64
import json
import logging
from typing import Any

from services.aihub import AIHubService
from schemas.aihub import ChatMessage, GenTxtRequest
from bot.config import FOOD_PARSE_MODEL, PHOTO_PARSE_MODEL, FOOD_SYSTEM_PROMPT, PHOTO_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _parse_food_json(text: str) -> list[dict[str, Any]]:
    """Извлечь JSON массив из ответа AI."""
    # Убрать markdown обёртку если есть
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[-1]
    if clean.endswith("```"):
        clean = clean.rsplit("```", 1)[0]
    clean = clean.strip()

    items = json.loads(clean)
    if not isinstance(items, list):
        items = [items]

    result = []
    for item in items:
        result.append({
            "food_name": str(item.get("food_name", "Неизвестно")),
            "portion_grams": int(item.get("portion_grams", 100)),
            "calories": float(item.get("calories", 0)),
            "protein": float(item.get("protein", 0)),
            "fat": float(item.get("fat", 0)),
            "carbs": float(item.get("carbs", 0)),
            "meal_type": str(item.get("meal_type", "snack")),
        })
    return result


async def parse_food_text(text: str) -> list[dict[str, Any]]:
    """Парсинг текстового описания еды через AI → список продуктов с КБЖУ."""
    service = AIHubService()
    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content=FOOD_SYSTEM_PROMPT),
            ChatMessage(role="user", content=text),
        ],
        model=FOOD_PARSE_MODEL,
        temperature=0.3,
        max_tokens=1000,
    )
    response = await service.gentxt(request)
    return _parse_food_json(response.content)


async def parse_food_photo(photo_bytes: bytes) -> list[dict[str, Any]]:
    """Распознавание еды по фото через AI vision → список продуктов с КБЖУ."""
    b64 = base64.b64encode(photo_bytes).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64}"

    service = AIHubService()
    request = GenTxtRequest(
        messages=[
            ChatMessage(role="system", content=PHOTO_SYSTEM_PROMPT),
            ChatMessage(
                role="user",
                content=[
                    {"type": "image_url", "image_url": {"url": data_uri}},
                    {"type": "text", "text": "Что на фото? Определи еду и оцени КБЖУ."},
                ],
            ),
        ],
        model=PHOTO_PARSE_MODEL,
        temperature=0.3,
        max_tokens=1000,
    )
    response = await service.gentxt(request)
    return _parse_food_json(response.content)
