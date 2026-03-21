from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Meal_plans(Base):
    __tablename__ = "meal_plans"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    plan_data = Column(String, nullable=True)
    week_start = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)