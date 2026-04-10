import logging
from typing import Any, Dict, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.products import Product

logger = logging.getLogger(__name__)

_OFF_URL = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
_OFF_TIMEOUT = 10.0


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
        # Убираем None-значения, чтобы не замусоривать JSON
        nutrition_100g = {k: v for k, v in nutrition_100g.items() if v is not None}

        # Пытаемся вытащить категорию из тегов OFF (en:meats → meat и т.д.)
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
            "meat": "meat",
            "poultry": "meat",
            "fish": "fish",
            "seafood": "fish",
            "dairy": "dairy",
            "milk": "dairy",
            "cheese": "dairy",
            "cereal": "grains",
            "grain": "grains",
            "rice": "grains",
            "pasta": "grains",
            "bread": "bakery",
            "baked": "bakery",
            "vegetable": "vegetables",
            "fruit": "fruits",
            "legume": "legumes",
            "bean": "legumes",
            "beverage": "beverages",
            "drink": "beverages",
            "oil": "oils",
            "fat": "oils",
            "snack": "snacks",
            "sweet": "snacks",
            "candy": "snacks",
        }
        for tag in tags:
            tag_lower = tag.lower()
            for keyword, category in mapping.items():
                if keyword in tag_lower:
                    return category
        return None


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
        """Возвращает продукт из кеша или загружает из OpenFoodFacts.

        Raises httpx.HTTPStatusError при rate limit (429).
        Возвращает None если продукт не найден в OFF.
        """
        # Сначала проверяем локальный кеш
        cached = await self.get_by_barcode(barcode)
        if cached:
            logger.debug(f"Product {barcode} found in local cache (id={cached.id})")
            return cached

        # Загружаем из OFF
        off_service = OpenFoodFactsService()
        data = await off_service.fetch(barcode)
        if not data:
            return None

        return await self.create_from_data(data)

    async def create_from_data(self, data: Dict[str, Any]) -> Product:
        """Создаёт Product из готового словаря данных."""
        try:
            obj = Product(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created product '{obj.name}' (id={obj.id}, barcode={obj.barcode})")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating product: {e}")
            raise
