"""Public product endpoints for SEO pages — no authentication required."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.products import Product

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/products", tags=["public_products"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class ProductPublic(BaseModel):
    id: int
    slug: Optional[str] = None
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    nutrition_100g: Optional[dict] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: List[ProductPublic]
    total: int
    limit: int
    offset: int


class CategoryCount(BaseModel):
    category: str
    count: int


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/categories", response_model=List[CategoryCount])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Список категорий с количеством продуктов (публичный)."""
    try:
        query = (
            select(Product.category, func.count(Product.id).label("count"))
            .where(Product.slug.isnot(None))
            .where(Product.category.isnot(None))
            .group_by(Product.category)
            .order_by(func.count(Product.id).desc())
        )
        result = await db.execute(query)
        rows = result.all()
        return [CategoryCount(category=row[0], count=row[1]) for row in rows]
    except Exception as e:
        logger.error(f"Error listing categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    search: Optional[str] = Query(None, description="Поиск по названию"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Список продуктов с пагинацией (публичный, только с slug)."""
    try:
        base = select(Product).where(Product.slug.isnot(None))
        count_q = select(func.count(Product.id)).where(Product.slug.isnot(None))

        if category:
            base = base.where(Product.category == category)
            count_q = count_q.where(Product.category == category)

        if search:
            like_pattern = f"%{search}%"
            base = base.where(Product.name.ilike(like_pattern))
            count_q = count_q.where(Product.name.ilike(like_pattern))

        # Total count
        total_result = await db.execute(count_q)
        total = total_result.scalar() or 0

        # Items
        query = base.order_by(Product.name).offset(offset).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()

        return ProductListResponse(
            items=[ProductPublic.model_validate(item) for item in items],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(f"Error listing products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/all-slugs", response_model=List[str])
async def all_slugs(db: AsyncSession = Depends(get_db)):
    """Все slug-и — для sitemap генерации."""
    try:
        result = await db.execute(
            select(Product.slug).where(Product.slug.isnot(None)).order_by(Product.slug)
        )
        return [row[0] for row in result.all()]
    except Exception as e:
        logger.error(f"Error fetching slugs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{slug}", response_model=ProductPublic)
async def get_product_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Получить продукт по slug (публичный)."""
    try:
        result = await db.execute(select(Product).where(Product.slug == slug))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return ProductPublic.model_validate(product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product {slug}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
