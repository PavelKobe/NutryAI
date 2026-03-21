from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class User_profiles(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    target_weight_kg = Column(Float, nullable=True)
    goal = Column(String, nullable=True)
    activity_level = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    cuisine_preferences = Column(String, nullable=True)
    budget_per_week = Column(Integer, nullable=True)
    city = Column(String, nullable=True)
    cooking_time_minutes = Column(Integer, nullable=True)
    target_calories = Column(Integer, nullable=True)
    target_protein = Column(Integer, nullable=True)
    target_fat = Column(Integer, nullable=True)
    target_carbs = Column(Integer, nullable=True)
    onboarding_completed = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)