from sqlalchemy import Column, String, Integer, JSON

from models.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = {"extend_existing": True}

    barcode = Column(String(50), unique=True, nullable=True, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=True)
    name = Column(String(500), nullable=False)
    brand = Column(String(255), nullable=True)
    image_url = Column(String(1000), nullable=True)
    # {"calories": float, "protein": float, "fat": float, "carbs": float,
    #  "fiber": float, "sugar": float, "sodium": float, "salt": float}
    nutrition_100g = Column(JSON, nullable=True)
    category = Column(String(100), nullable=True)
    # "openfoodfacts" | "manual"
    source_api = Column(String(50), nullable=False, server_default="manual")
