import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.limiter import limiter
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from schemas.products import ScanRequest, UserProductOut
from services.products import ProductsService
from services.user_products import UserProductsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["scan"])


@router.post("/scan", response_model=UserProductOut, status_code=201)
@limiter.limit("10/minute")
async def scan_barcode(
    request: Request,
    body: ScanRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Поиск продукта по штрихкоду (EAN-8 / UPC-A / EAN-13 / EAN-14).

    1. Проверяет локальный кеш products.
    2. При отсутствии — запрашивает OpenFoodFacts.
    3. Добавляет продукт в коллекцию текущего пользователя (upsert).
    """
    barcode = body.barcode
    products_svc = ProductsService(db)
    user_products_svc = UserProductsService(db)

    try:
        product = await products_svc.upsert_from_off(barcode)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="OpenFoodFacts rate limit exceeded. Please try again in a moment.",
            )
        logger.error(f"OpenFoodFacts HTTP error for barcode {barcode}: {e}")
        raise HTTPException(status_code=502, detail="External product database unavailable.")

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product with barcode {barcode} not found. Please add it manually.",
        )

    user_product = await user_products_svc.upsert(
        product_id=product.id,
        user_id=str(current_user.id),
    )

    logger.info(f"Scan: user={current_user.id} barcode={barcode} product_id={product.id}")
    return user_product
