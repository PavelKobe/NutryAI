import logging
import time
from typing import Any, Dict, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.products import Product

logger = logging.getLogger(__name__)

_OFF_URL = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
_OFF_TIMEOUT = 10.0

_FS_TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
_FS_API_URL = "https://platform.fatsecret.com/rest/server.api"
_FS_TIMEOUT = 10.0


class OpenFoodFactsService:
    """Клиент для получения данных продукта по штрихкоду через OpenFoodFacts API."""

    async def fetch(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Запрашивает продукт из OFF. Возвращает распарсенный dict или None при ошибке/отсутствии."""
        url = _OFF_URL.format(barcode=barcode)
        try:
            async with httpx.AsyncClient(timeout=_OFF_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": "NutryAI/1.0"})

            if resp.status_code == 429:
                logger.warning(f"OpenFoodFacts rate limit hit for barcode {barcode}")
                raise httpx.HTTPStatusError("Rate limited by OpenFoodFacts", request=resp.request, response=resp)

            if resp.status_code != 200:
                logger.warning(f"OpenFoodFacts returned {resp.status_code} for barcode {barcode}")
                return None

            data = resp.json()
            if data.get("status") != 1:
                logger.info(f"Product {barcode} not found in OpenFoodFacts")
                return None

            return self._parse(data["product"], barcode)

        except httpx.HTTPStatusError:
            raise
        except httpx.TimeoutException:
            logger.warning(f"OpenFoodFacts timeout for barcode {barcode}")
            return None
        except Exception as e:
            logger.error(f"OpenFoodFacts fetch error for {barcode}: {e}")
            return None

    def _parse(self, product: Dict[str, Any], barcode: str) -> Dict[str, Any]:
        """Маппинг полей OFF API → наша внутренняя схема."""
        nutriments = product.get("nutriments", {})

        def _num(key: str) -> Optional[float]:
            val = nutriments.get(key)
            try:
                return float(val) if val is not None else None
            except (TypeError, ValueError):
                return None

        nutrition_100g = {
            "calories": _num("energy-kcal_100g"),
            "protein": _num("proteins_100g"),
            "fat": _num("fat_100g"),
            "carbs": _num("carbohydrates_100g"),
            "fiber": _num("fiber_100g"),
            "sugar": _num("sugars_100g"),
            "sodium": _num("sodium_100g"),
            "salt": _num("salt_100g"),
        }
        nutrition_100g = {k: v for k, v in nutrition_100g.items() if v is not None}

        category = self._map_category(product.get("categories_tags", []))

        return {
            "barcode": barcode,
            "name": product.get("product_name") or product.get("product_name_ru") or barcode,
            "brand": product.get("brands"),
            "image_url": product.get("image_front_url") or product.get("image_url"),
            "nutrition_100g": nutrition_100g or None,
            "category": category,
            "source_api": "openfoodfacts",
        }

    def _map_category(self, tags: list) -> Optional[str]:
        """Грубый маппинг тегов OpenFoodFacts на наши категории."""
        mapping = {
            "meat": "meat", "poultry": "meat",
            "fish": "fish", "seafood": "fish",
            "dairy": "dairy", "milk": "dairy", "cheese": "dairy",
            "cereal": "grains", "grain": "grains", "rice": "grains", "pasta": "grains",
            "bread": "bakery", "baked": "bakery",
            "vegetable": "vegetables",
            "fruit": "fruits",
            "legume": "legumes", "bean": "legumes",
            "beverage": "beverages", "drink": "beverages",
            "oil": "oils", "fat": "oils",
            "snack": "snacks", "sweet": "snacks", "candy": "snacks",
        }
        for tag in tags:
            tag_lower = tag.lower()
            for keyword, category in mapping.items():
                if keyword in tag_lower:
                    return category
        return None


class FatSecretService:
    """Клиент FatSecret Platform API — fallback после OpenFoodFacts для российских продуктов."""

    # Токен кешируется на уровне класса (переживает несколько запросов)
    _access_token: Optional[str] = None
    _token_expires_at: float = 0.0

    def _is_configured(self) -> bool:
        """Проверяет наличие credentials в env."""
        try:
            from core.config import settings
            return bool(getattr(settings, "fatsecret_client_id", None) and
                        getattr(settings, "fatsecret_client_secret", None))
        except Exception:
            return False

    async def _get_token(self) -> Optional[str]:
        """OAuth 2.0 client credentials — получает или возвращает кешированный токен."""
        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token

        try:
            from core.config import settings
            client_id = settings.fatsecret_client_id
            client_secret = settings.fatsecret_client_secret
        except AttributeError:
            return None

        try:
            async with httpx.AsyncClient(timeout=_FS_TIMEOUT) as client:
                resp = await client.post(
                    _FS_TOKEN_URL,
                    data={
                        "grant_type": "client_credentials",
                        "scope": "basic",
                        "client_id": client_id,
                        "client_secret": client_secret,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                FatSecretService._access_token = data["access_token"]
                FatSecretService._token_expires_at = time.time() + int(data.get("expires_in", 86400))
                return FatSecretService._access_token
        except Exception as e:
            logger.warning(f"FatSecret token error: {e}")
            return None

    async def fetch(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Ищет продукт по штрихкоду в FatSecret. Возвращает dict или None."""
        if not self._is_configured():
            logger.debug("FatSecret not configured, skipping")
            return None

        token = await self._get_token()
        if not token:
            return None

        try:
            async with httpx.AsyncClient(timeout=_FS_TIMEOUT) as client:
                headers = {"Authorization": f"Bearer {token}"}

                # Шаг 1: найти food_id по штрихкоду
                resp = await client.get(
                    _FS_API_URL,
                    params={"method": "food.find_id_for_barcode", "barcode": barcode, "format": "json"},
                    headers=headers,
                )
                resp.raise_for_status()
                food_id_data = resp.json()

                food_id = (food_id_data.get("food_id") or {}).get("value")
                if not food_id:
                    logger.info(f"FatSecret: barcode {barcode} not found")
                    return None

                # Шаг 2: получить детали продукта
                resp = await client.get(
                    _FS_API_URL,
                    params={"method": "food.get.v4", "food_id": food_id, "format": "json"},
                    headers=headers,
                )
                resp.raise_for_status()
                food_data = resp.json().get("food", {})
                if not food_data:
                    return None

                return self._parse(food_data, barcode)

        except httpx.TimeoutException:
            logger.warning(f"FatSecret timeout for barcode {barcode}")
            return None
        except Exception as e:
            logger.warning(f"FatSecret fetch error for {barcode}: {e}")
            return None

    def _parse(self, food: Dict[str, Any], barcode: str) -> Dict[str, Any]:
        """Маппинг FatSecret food → наша схема. Нормализует КБЖУ к 100г."""
        servings = food.get("servings", {}).get("serving", [])
        if isinstance(servings, dict):
            servings = [servings]

        # Предпочитаем порцию на 100г, иначе берём первую
        serving = next(
            (s for s in servings
             if s.get("metric_serving_unit") == "g"
             and abs(float(s.get("metric_serving_amount", 0) or 0) - 100) < 1),
            servings[0] if servings else {},
        )

        amount = float(serving.get("metric_serving_amount") or 100)
        factor = 100.0 / amount if amount else 1.0

        def _num(key: str) -> Optional[float]:
            try:
                val = serving.get(key)
                return round(float(val) * factor, 2) if val is not None else None
            except (TypeError, ValueError):
                return None

        nutrition_100g = {
            "calories": _num("calories"),
            "protein":  _num("protein"),
            "fat":      _num("fat"),
            "carbs":    _num("carbohydrate"),
            "fiber":    _num("fiber"),
            "sugar":    _num("sugar"),
            "sodium":   _num("sodium"),
        }
        nutrition_100g = {k: v for k, v in nutrition_100g.items() if v is not None}

        return {
            "barcode": barcode,
            "name": food.get("food_name", barcode),
            "brand": food.get("brand_name"),
            "image_url": None,  # FatSecret не отдаёт фото в базовом API
            "nutrition_100g": nutrition_100g or None,
            "category": None,
            "source_api": "fatsecret",
        }


class ProductsService:
    """CRUD и бизнес-логика для глобального каталога продуктов."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_barcode(self, barcode: str) -> Optional[Product]:
        """Ищет продукт по штрихкоду в локальном кеше."""
        try:
            result = await self.db.execute(
                select(Product).where(Product.barcode == barcode)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching product by barcode {barcode}: {e}")
            raise

    async def upsert_from_off(self, barcode: str) -> Optional[Product]:
        """Алиас для обратной совместимости → делегирует в upsert_from_external."""
        return await self.upsert_from_external(barcode)

    async def upsert_from_external(self, barcode: str) -> Optional[Product]:
        """Возвращает продукт из кеша или ищет во внешних базах.

        Цепочка:
          1. Локальный кеш (таблица products)
          2. OpenFoodFacts
          3. FatSecret (если настроен FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET)

        Raises httpx.HTTPStatusError при rate limit от OFF (429).
        Возвращает None если продукт не найден нигде.
        """
        # 1. Локальный кеш
        cached = await self.get_by_barcode(barcode)
        if cached:
            logger.debug(f"Product {barcode} found in local cache (id={cached.id})")
            return cached

        # 2. OpenFoodFacts
        off_data = await OpenFoodFactsService().fetch(barcode)
        if off_data:
            logger.info(f"Product {barcode} found in OpenFoodFacts")
            return await self.create_from_data(off_data)

        # 3. FatSecret
        fs_data = await FatSecretService().fetch(barcode)
        if fs_data:
            logger.info(f"Product {barcode} found in FatSecret")
            return await self.create_from_data(fs_data)

        logger.info(f"Product {barcode} not found in any external source")
        return None

    async def create_from_data(self, data: Dict[str, Any]) -> Product:
        """Создаёт Product из готового словаря данных."""
        try:
            obj = Product(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created product '{obj.name}' (id={obj.id}, barcode={obj.barcode}, source={obj.source_api})")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating product: {e}")
            raise
