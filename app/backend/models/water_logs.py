from core.database import Base
from sqlalchemy import Column, DateTime, Float, Index, Integer, String


class Water_logs(Base):
    __tablename__ = "water_logs"
    __mapper_args__ = {"confirm_deleted_rows": False}
    
    __table_args__ = (
        Index("ix_water_logs_user_id", "user_id"),
        Index("ix_water_logs_logged_at", "logged_at"),
        Index("ix_water_logs_user_id_logged_at", "user_id", "logged_at"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    amount_ml = Column(Integer, nullable=False)
    logged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)