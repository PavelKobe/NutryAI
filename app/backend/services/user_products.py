import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.products import Product
from models.user_products import UserProduct

logger = logging.getLogger(__name__)


class UserProductsService:
    """CRUD для пользовательской коллекции продуктов."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[UserProduct]:
        try:
            query = select(UserProduct).where(UserProduct.id == obj_id)
            if user_id is not None:
                query = query.where(UserProduct.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user_product {obj_id}: {e}")
            raise

    async def get_by_user_and_product(self, user_id: str, product_id: int) -> Optional[UserProduct]:
        """Возвращает запись коллекции по паре (user_id, product_id)."""
        try:
            result = await self.db.execute(
                select(UserProduct).where(
                    UserProduct.user_id == user_id,
                    UserProduct.product_id == product_id,
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user_product for user={user_id} product={product_id}: {e}")
            raise

    async def get_list(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            query = select(UserProduct).where(UserProduct.user_id == user_id)
            count_query = select(func.count(UserProduct.id)).where(UserProduct.user_id == user_id)

            if search:
                # Поиск по кастомному имени или по полям продукта (через JOIN)
                query = query.join(Product, UserProduct.product_id == Product.id).where(
                    or_(
                        UserProduct.custom_name.ilike(f"%{search}%"),
                        Product.name.ilike(f"%{search}%"),
                        Product.brand.ilike(f"%{search}%"),
                    )
                )
                count_query = count_query.join(Product, UserProduct.product_id == Product.id).where(
                    or_(
                        UserProduct.custom_name.ilike(f"%{search}%"),
                        Product.name.ilike(f"%{search}%"),
                        Product.brand.ilike(f"%{search}%"),
                    )
                )

            if category:
                query = query.where(UserProduct.category == category)
                count_query = count_query.where(UserProduct.category == category)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith("-"):
                    field_name = sort[1:]
                    if hasattr(UserProduct, field_name):
                        query = query.order_by(getattr(UserProduct, field_name).desc())
                else:
                    if hasattr(UserProduct, sort):
                        query = query.order_by(getattr(UserProduct, sort))
            else:
                query = query.order_by(UserProduct.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching user_products list: {e}")
            raise

    async def create(self, data: Dict[str, Any], user_id: str) -> UserProduct:
        """Создаёт запись UserProduct.

        Если data["product_id"] указан — привязываем существующий Product.
        Иначе — создаём новый Product с source_api="manual" и привязываем его.
        """
        try:
            product_id = data.get("product_id")

            if not product_id:
                # Ручное добавление: создаём Product из переданных данных
                product_name = data.get("name")
                if not product_name:
                    raise ValueError("name is required when product_id is not provided")

                product = Product(
                    barcode=data.get("barcode") or None,
                    name=product_name,
                    brand=data.get("brand"),
                    image_url=data.get("image_url"),
                    nutrition_100g=data.get("nutrition_100g"),
                    category=data.get("category"),
                    source_api="manual",
                )
                self.db.add(product)
                await self.db.flush()  # получаем product.id без коммита
                product_id = product.id

            obj = UserProduct(
                user_id=user_id,
                product_id=product_id,
                custom_name=data.get("custom_name"),
                serving_g=data.get("serving_g", 100.0),
                category=data.get("category"),
                tags=data.get("tags"),
                is_favorite=data.get("is_favorite", False),
            )
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created user_product id={obj.id} for user={user_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating user_product: {e}")
            raise

    async def upsert(
        self, product_id: int, user_id: str, extras: Optional[Dict[str, Any]] = None
    ) -> UserProduct:
        """Возвращает существующую или создаёт новую запись в коллекции юзера.

        Используется в scan-потоке: если юзер уже добавил этот продукт — возвращаем его запись.
        """
        existing = await self.get_by_user_and_product(user_id, product_id)
        if existing:
            return existing

        extras = extras or {}
        obj = UserProduct(
            user_id=user_id,
            product_id=product_id,
            custom_name=extras.get("custom_name"),
            serving_g=extras.get("serving_g", 100.0),
            category=extras.get("category"),
            tags=extras.get("tags"),
            is_favorite=extras.get("is_favorite", False),
        )
        try:
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Upserted user_product id={obj.id} for user={user_id} product={product_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upserting user_product: {e}")
            raise

    async def update(
        self, obj_id: int, update_data: Dict[str, Any], user_id: str
    ) -> Optional[UserProduct]:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                return None
            allowed = {"custom_name", "serving_g", "category", "tags", "is_favorite"}
            for key, value in update_data.items():
                if key in allowed:
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated user_product {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating user_product {obj_id}: {e}")
            raise

    async def delete(self, obj_id: int, user_id: str) -> bool:
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted user_product {obj_id} for user={user_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting user_product {obj_id}: {e}")
            raise

    async def get_favorites_for_ai(self, user_id: str) -> List[Dict[str, Any]]:
        """Возвращает список избранных/отмеченных продуктов для ИИ-генерации плана питания.

        Используется сервисом генерации meal plan, когда пользователь включил
        опцию 'учитывать мои продукты'.
        """
        try:
            result = await self.db.execute(
                select(UserProduct)
                .where(UserProduct.user_id == user_id)
                .order_by(UserProduct.is_favorite.desc(), UserProduct.id.desc())
                .limit(50)
            )
            items = result.scalars().all()

            products_for_ai = []
            for up in items:
                p = up.product
                if not p:
                    continue
                nutrition = p.nutrition_100g or {}
                products_for_ai.append({
                    "name": up.custom_name or p.name,
                    "brand": p.brand,
                    "category": up.category or p.category,
                    "serving_g": up.serving_g or 100,
                    "is_favorite": up.is_favorite,
                    "calories_per_100g": nutrition.get("calories"),
                    "protein_per_100g": nutrition.get("protein"),
                    "fat_per_100g": nutrition.get("fat"),
                    "carbs_per_100g": nutrition.get("carbs"),
                })
            return products_for_ai
        except Exception as e:
            logger.error(f"Error fetching products for AI for user={user_id}: {e}")
            return []
