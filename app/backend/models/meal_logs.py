from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Meal_logs(Base):
    __tablename__ = "meal_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    meal_type = Column(String, nullable=True)
    food_name = Column(String, nullable=True)
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    portion_grams = Column(Float, nullable=True)
    photo_url = Column(String, nullable=True)
    photo_object_key = Column(String, nullable=True)
    photo_kept_until = Column(DateTime(timezone=True), nullable=True)
    logged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)