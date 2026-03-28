from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WaterLogBase(BaseModel):
    amount_ml: int = Field(..., ge=0, description="Amount of water in milliliters")


class WaterLogCreate(WaterLogBase):
    logged_at: Optional[datetime] = None


class WaterLogUpdate(BaseModel):
    amount_ml: Optional[int] = Field(None, ge=0)
    logged_at: Optional[datetime] = None


class WaterLogResponse(WaterLogBase):
    id: int
    user_id: str
    logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WaterLogSummary(BaseModel):
    total_ml: int
    target_ml: int
    percentage: float
    entries_count: int
    date: str