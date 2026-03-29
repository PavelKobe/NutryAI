from core.database import Base
from sqlalchemy import Column, DateTime, Float, Index, Integer, String


class Weight_logs(Base):
    __tablename__ = "weight_logs"
    __mapper_args__ = {"confirm_deleted_rows": False}
    
    __table_args__ = (
        Index("ix_weight_logs_user_id", "user_id"),
        Index("ix_weight_logs_logged_at", "logged_at"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    weight_kg = Column(Float, nullable=True)
    logged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)