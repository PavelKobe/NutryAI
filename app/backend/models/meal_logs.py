from core.database import Base
from sqlalchemy import Column, DateTime, Float, Index, Integer, String


class Meal_logs(Base):
    __tablename__ = "meal_logs"
    __table_args__ = (
        {"extend_existing": True},
        Index("ix_meal_logs_user_id", "user_id"),
        Index("ix_meal_logs_logged_at", "logged_at"),
        Index("ix_meal_logs_user_id_logged_at", "user_id", "logged_at"),
    )

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
    
    # Micronutrients
    fiber_g = Column(Float, nullable=True)
    sugar_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    cholesterol_mg = Column(Float, nullable=True)
    saturated_fat_g = Column(Float, nullable=True)
    trans_fat_g = Column(Float, nullable=True)
    
    # Vitamins
    vitamin_a_mcg = Column(Float, nullable=True)
    vitamin_c_mg = Column(Float, nullable=True)
    vitamin_d_mcg = Column(Float, nullable=True)
    vitamin_e_mg = Column(Float, nullable=True)
    vitamin_k_mcg = Column(Float, nullable=True)
    vitamin_b1_mg = Column(Float, nullable=True)
    vitamin_b2_mg = Column(Float, nullable=True)
    vitamin_b3_mg = Column(Float, nullable=True)
    vitamin_b5_mg = Column(Float, nullable=True)
    vitamin_b6_mg = Column(Float, nullable=True)
    vitamin_b7_mcg = Column(Float, nullable=True)
    vitamin_b9_mcg = Column(Float, nullable=True)
    vitamin_b12_mcg = Column(Float, nullable=True)
    
    # Minerals
    calcium_mg = Column(Float, nullable=True)
    iron_mg = Column(Float, nullable=True)
    magnesium_mg = Column(Float, nullable=True)
    phosphorus_mg = Column(Float, nullable=True)
    potassium_mg = Column(Float, nullable=True)
    zinc_mg = Column(Float, nullable=True)
    copper_mg = Column(Float, nullable=True)
    manganese_mg = Column(Float, nullable=True)
    selenium_mcg = Column(Float, nullable=True)
    fluoride_mg = Column(Float, nullable=True)