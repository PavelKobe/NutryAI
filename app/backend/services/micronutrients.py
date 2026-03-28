import json
import logging
import re
from typing import Any, Dict

from core.config import settings
from schemas.aihub import ChatMessage, GenTxtRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)


MICRONUTRIENT_FIELDS = [
    "fiber_g",
    "sugar_g",
    "sodium_mg",
    "cholesterol_mg",
    "saturated_fat_g",
    "trans_fat_g",
    "vitamin_a_mcg",
    "vitamin_c_mg",
    "vitamin_d_mcg",
    "vitamin_e_mg",
    "vitamin_k_mcg",
    "vitamin_b1_mg",
    "vitamin_b2_mg",
    "vitamin_b3_mg",
    "vitamin_b5_mg",
    "vitamin_b6_mg",
    "vitamin_b7_mcg",
    "vitamin_b9_mcg",
    "vitamin_b12_mcg",
    "calcium_mg",
    "iron_mg",
    "magnesium_mg",
    "phosphorus_mg",
    "potassium_mg",
    "zinc_mg",
    "copper_mg",
    "manganese_mg",
    "selenium_mcg",
    "fluoride_mg",
]


class MicronutrientsService:
    """Estimates meal micronutrients with AI and returns validated numeric payload."""

    @staticmethod
    def default_zero_payload() -> Dict[str, float]:
        return {field: 0.0 for field in MICRONUTRIENT_FIELDS}

    @staticmethod
    def _extract_json(raw: str) -> Dict[str, Any]:
        text = (raw or "").strip()
        if not text:
            raise ValueError("Empty AI response")
        match = re.search(r"\{[\s\S]*\}", text)
        json_text = match.group(0) if match else text
        parsed = json.loads(json_text)
        if not isinstance(parsed, dict):
            raise ValueError("AI response is not an object")
        return parsed

    @staticmethod
    def _to_float(value: Any) -> float:
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.replace(",", ".").strip()
            return float(cleaned) if cleaned else 0.0
        return 0.0

    @classmethod
    def _normalize(cls, payload: Dict[str, Any]) -> Dict[str, float]:
        result: Dict[str, float] = {}
        for field in MICRONUTRIENT_FIELDS:
            try:
                result[field] = max(0.0, cls._to_float(payload.get(field)))
            except Exception:
                result[field] = 0.0
        return result

    @classmethod
    async def estimate_for_meal(
        cls,
        *,
        food_name: str,
        portion_grams: float | None,
        calories: float | None,
        protein: float | None,
        fat: float | None,
        carbs: float | None,
    ) -> Dict[str, float]:
        if not food_name:
            return cls.default_zero_payload()

        system_prompt = (
            "Ты нутрициолог и аналитик состава продуктов. "
            "Верни ТОЛЬКО валидный JSON объект без markdown и комментариев. "
            "Все значения только числа >= 0. "
            "Не добавляй поля вне запрошенного списка."
        )
        user_prompt = f"""
Оцени микронутриенты для блюда на русском языке по входным данным.
Блюдо: {food_name}
Порция (г): {portion_grams or 100}
Калории: {calories or 0}
Белки: {protein or 0}
Жиры: {fat or 0}
Углеводы: {carbs or 0}

Верни JSON с полями:
{", ".join(MICRONUTRIENT_FIELDS)}
"""

        try:
            aihub = AIHubService()
            request = GenTxtRequest(
                messages=[
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_prompt),
                ],
                model=getattr(settings, "micronutrients_model", "openai/gpt-4o-mini"),
                stream=False,
                temperature=0.1,
                max_tokens=1200,
            )
            response = await aihub.gentxt(request)
            parsed = cls._extract_json(response.content)
            return cls._normalize(parsed)
        except Exception as exc:
            logger.warning("Micronutrients estimation failed for '%s': %s", food_name, exc)
            return cls.default_zero_payload()
