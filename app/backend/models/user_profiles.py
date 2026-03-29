from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String


class User_profiles(Base):
    __tablename__ = "user_profiles"
    __mapper_args__ = {"confirm_deleted_rows": False}
    
    __table_args__ = (
        Index("ix_user_profiles_user_id", "user_id"),
    )

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
    
    # Water tracking targets
    target_water_ml = Column(Integer, default=2000, nullable=True)
    
    # Micronutrient targets
    target_fiber_g = Column(Float, nullable=True)
    target_sodium_mg = Column(Float, nullable=True)
    target_sugar_g = Column(Float, nullable=True)
    
    # Vitamin targets
    target_vitamin_a_mcg = Column(Float, nullable=True)
    target_vitamin_c_mg = Column(Float, nullable=True)
    target_vitamin_d_mcg = Column(Float, nullable=True)
    target_vitamin_e_mg = Column(Float, nullable=True)
    target_vitamin_k_mcg = Column(Float, nullable=True)
    target_vitamin_b12_mcg = Column(Float, nullable=True)
    target_folate_mcg = Column(Float, nullable=True)
    
    # Mineral targets
    target_calcium_mg = Column(Float, nullable=True)
    target_iron_mg = Column(Float, nullable=True)
    target_magnesium_mg = Column(Float, nullable=True)
    target_potassium_mg = Column(Float, nullable=True)
    target_zinc_mg = Column(Float, nullable=True)