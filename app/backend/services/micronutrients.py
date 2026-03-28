import json
import logging
import re
import time
from typing import Any, Dict

from core.config import settings
from schemas.aihub import ChatMessage, GenTxtRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```")
_JSON_OBJ_RE = re.compile(r"\{[\s\S]*\}")


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
        fence = _JSON_FENCE_RE.search(text)
        if fence:
            text = fence.group(1).strip()
        match = _JSON_OBJ_RE.search(text)
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
            logger.debug("estimate_for_meal: empty food_name, returning zeros")
            return cls.default_zero_payload()

        logger.info(
            "estimate_for_meal START: food=%r, portion=%s, cal=%s, p=%s, f=%s, c=%s",
            food_name, portion_grams, calories, protein, fat, carbs,
        )

        system_prompt = (
            "Ты нутрициолог и аналитик состава продуктов. "
            "Верни ТОЛЬКО валидный JSON объект без markdown и комментариев. "
            "Все значения только числа >= 0. "
            "Не добавляй поля вне запрошенного списка."
        )
        user_prompt = (
            f"Оцени микронутриенты для блюда на русском языке по входным данным.\n"
            f"Блюдо: {food_name}\n"
            f"Порция (г): {portion_grams or 100}\n"
            f"Калории: {calories or 0}\n"
            f"Белки: {protein or 0}\n"
            f"Жиры: {fat or 0}\n"
            f"Углеводы: {carbs or 0}\n\n"
            f"Верни JSON с полями:\n{', '.join(MICRONUTRIENT_FIELDS)}"
        )

        t0 = time.monotonic()

        try:
            aihub = AIHubService()
        except ValueError as exc:
            logger.error(
                "estimate_for_meal FAIL (AI not configured): %s — "
                "check APP_AI_BASE_URL and APP_AI_KEY env vars",
                exc,
            )
            return cls.default_zero_payload()

        model_name = getattr(settings, "micronutrients_model", "openai/gpt-4o-mini")

        try:
            request = GenTxtRequest(
                messages=[
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_prompt),
                ],
                model=model_name,
                stream=False,
                temperature=0.1,
                max_tokens=1200,
            )
            response = await aihub.gentxt(request)
            elapsed = time.monotonic() - t0

            raw_content = response.content or ""
            logger.info(
                "estimate_for_meal AI response (%.1fs, model=%s): %s",
                elapsed, model_name, raw_content[:300],
            )

            parsed = cls._extract_json(raw_content)
            result = cls._normalize(parsed)

            nonzero = sum(1 for v in result.values() if v > 0)
            logger.info(
                "estimate_for_meal OK: food=%r, nonzero_fields=%d/%d",
                food_name, nonzero, len(MICRONUTRIENT_FIELDS),
            )
            return result

        except json.JSONDecodeError as exc:
            logger.error(
                "estimate_for_meal FAIL (JSON parse): food=%r, error=%s, raw=%s",
                food_name, exc, (raw_content[:200] if 'raw_content' in dir() else "N/A"),
                exc_info=True,
            )
            return cls.default_zero_payload()
        except Exception as exc:
            elapsed = time.monotonic() - t0
            logger.error(
                "estimate_for_meal FAIL (%.1fs): food=%r, type=%s, error=%s",
                elapsed, food_name, type(exc).__name__, exc,
                exc_info=True,
            )
            return cls.default_zero_payload()
