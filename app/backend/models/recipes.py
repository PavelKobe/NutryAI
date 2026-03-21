from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Recipes(Base):
    __tablename__ = "recipes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    cuisine = Column(String, nullable=True)
    calories = Column(Integer, nullable=True)
    protein = Column(Integer, nullable=True)
    fat = Column(Integer, nullable=True)
    carbs = Column(Integer, nullable=True)
    cooking_time = Column(Integer, nullable=True)
    servings = Column(Integer, nullable=True)
    ingredients = Column(String, nullable=True)
    instructions = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)