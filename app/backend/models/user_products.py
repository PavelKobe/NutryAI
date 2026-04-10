from sqlalchemy import Column, String, Integer, Float, JSON, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from models.base import BaseModel


class UserProduct(BaseModel):
    __tablename__ = "user_products"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_user_product"),
        {"extend_existing": True},
    )

    user_id = Column(String, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    custom_name = Column(String(500), nullable=True)
    serving_g = Column(Float, nullable=True, default=100.0)
    # крупы | мясо | молочка | рыба | овощи | фрукты | бобовые | выпечка | снеки | напитки | масла | другое
    category = Column(String(100), nullable=True)
    # ["без лактозы", "веган", ...] — пользовательские теги
    tags = Column(JSON, nullable=True)
    is_favorite = Column(Boolean, nullable=False, server_default="false")

    # Загружаем продукт одним SELECT IN при каждом запросе — безопасно для async
    product = relationship("Product", lazy="selectin")
