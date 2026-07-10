import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nutrient_insights import NutrientInsightsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai/nutrient-insight", tags=["nutrient-insights"])


class NutrientInsightResponse(BaseModel):
    """AI nutrient insight response"""
    insight: str
    days: int


# ---------- Endpoints ----------

@router.get("", response_model=NutrientInsightResponse)
async def get_nutrient_insight(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    model: str | None = Query(None, description="AI model; по умолчанию settings.nutrient_insight_model"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI-generated nutrient insight based on recent eating patterns"""
    try:
        service = NutrientInsightsService(db)
        insight = await service.get_ai_insight(
            user_id=current_user.id,
            days=days,
            model=model
        )
        return {
            "insight": insight,
            "days": days
        }
    except Exception as e:
        logger.error(f"Error generating nutrient insight: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate nutrient insight")