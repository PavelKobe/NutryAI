from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator


# ─── Requests ──────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    barcode: str

    @field_validator("barcode")
    @classmethod
    def validate_barcode(cls, v: str) -> str:
        import re
        v = v.strip()
        if not re.match(r"^[0-9]{8,14}$", v):
            raise ValueError("Barcode must be 8–14 digits (EAN-8, UPC-A, EAN-13, EAN-14)")
        return v


class UserProductCreate(BaseModel):
    """Используется для ручного добавления продукта пользователем.

    Если product_id указан — продукт уже есть в глобальном каталоге, просто привязываем.
    Иначе — создаём новый Product с source_api="manual".
    """
    product_id: Optional[int] = None

    # Поля для создания нового Product (нужны если product_id не указан)
    name: Optional[str] = None
    brand: Optional[str] = None
    barcode: Optional[str] = None
    nutrition_100g: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

    # Поля UserProduct
    custom_name: Optional[str] = None
    serving_g: Optional[float] = 100.0
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: bool = False


class UserProductUpdate(BaseModel):
    custom_name: Optional[str] = None
    serving_g: Optional[float] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


# ─── Responses ─────────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int
    barcode: Optional[str] = None
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    nutrition_100g: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    source_api: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProductOut(BaseModel):
    id: int
    user_id: str
    product_id: int
    custom_name: Optional[str] = None
    serving_g: Optional[float] = None
    stock_grams: Optional[float] = 0
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: bool
    created_at: Optional[datetime] = None
    product: ProductOut

    class Config:
        from_attributes = True


class UserProductsListResponse(BaseModel):
    items: List[UserProductOut]
    total: int
    skip: int
    limit: int


class CheckShoppingItemRequest(BaseModel):
    """Отметка товара в Shopping List.

    Сервис ищет существующий user_product юзера по совпадению имени
    (case-insensitive); если нашёл — прибавляет grams к stock_grams,
    если нет — создаёт новый.
    """

    name: str
    grams: Optional[float] = None  # None или 0 — не накапливать массу

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("name must not be empty")
        if len(v) > 500:
            raise ValueError("name too long (max 500)")
        return v
