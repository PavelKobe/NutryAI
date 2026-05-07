import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from schemas.products import (
    CheckShoppingItemRequest,
    UserProductCreate,
    UserProductOut,
    UserProductUpdate,
    UserProductsListResponse,
)
from services.user_products import UserProductsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/user_products", tags=["user_products"])


@router.get("", response_model=UserProductsListResponse)
async def list_user_products(
    search: str = Query(None, description="Поиск по названию продукта или бренду"),
    category: str = Query(None, description="Фильтр по категории"),
    sort: str = Query(None, description="Поле сортировки (prefix '-' для desc)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список продуктов в коллекции текущего пользователя."""
    service = UserProductsService(db)
    try:
        result = await service.get_list(
            user_id=str(current_user.id),
            skip=skip,
            limit=limit,
            search=search,
            category=category,
            sort=sort,
        )
        return result
    except Exception as e:
        logger.error(f"Error listing user_products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.get("/{id}", response_model=UserProductOut)
async def get_user_product(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить один продукт из коллекции."""
    service = UserProductsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=404, detail="User product not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user_product {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("", response_model=UserProductOut, status_code=201)
async def create_user_product(
    data: UserProductCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ручное добавление продукта в коллекцию.

    - Если указан product_id — привязывает существующий глобальный продукт.
    - Иначе — создаёт новый продукт (source_api="manual") и привязывает его.
    """
    service = UserProductsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        logger.info(f"Created user_product id={result.id} for user={current_user.id}")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user_product: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.put("/{id}", response_model=UserProductOut)
async def update_user_product(
    id: int,
    data: UserProductUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновить кастомные поля продукта (название, порция, категория, теги, избранное)."""
    service = UserProductsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=404, detail="User product not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user_product {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.get("/for-ai")
async def get_products_for_ai(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает список продуктов пользователя в формате для системного промпта ИИ.

    Используется при генерации плана питания когда включена опция
    'учитывать мои продукты'.
    """
    service = UserProductsService(db)
    try:
        products = await service.get_favorites_for_ai(str(current_user.id))
        return {"products": products}
    except Exception as e:
        logger.error(f"Error fetching products for AI: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/check-shopping-item", response_model=UserProductOut)
async def check_shopping_item(
    body: CheckShoppingItemRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отметка товара в Shopping List.

    Если у пользователя уже есть user_product с таким именем
    (совпадение custom_name или Product.name, case-insensitive) —
    прибавляет grams к stock_grams. Иначе — создаёт новый
    user_product (с автоматическим созданием Product source_api='manual').
    """
    service = UserProductsService(db)
    try:
        result = await service.check_shopping_item(
            user_id=str(current_user.id),
            name=body.name,
            grams=body.grams,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in check_shopping_item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.delete("/{id}")
async def delete_user_product(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить продукт из коллекции (глобальный кеш products не затрагивается)."""
    service = UserProductsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            raise HTTPException(status_code=404, detail="User product not found")
        return {"message": "Deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user_product {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
