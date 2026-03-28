import logging
from typing import List, Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.water_logs import Water_logsService
from services.user_profiles import User_profilesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/water_logs", tags=["water_logs"])


# ---------- Pydantic Schemas ----------
class Water_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    amount_ml: int
    logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Water_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    amount_ml: Optional[int] = None
    logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class Water_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    amount_ml: int
    logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WaterLogSummaryResponse(BaseModel):
    """Summary response for water intake"""
    total_ml: int
    target_ml: int
    percentage: float
    entries_count: int
    date: str


class PaginatedWaterLogsResponse(BaseModel):
    """Paginated response for water logs"""
    items: List[Water_logsResponse]
    total: int
    limit: int
    offset: int


# ---------- Endpoints ----------

@router.post("", response_model=Water_logsResponse, status_code=201)
async def create_water_log(
    data: Water_logsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new water log entry"""
    service = Water_logsService(db)
    result = await service.create(data.model_dump(), user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create water log")
    return result


@router.get("", response_model=PaginatedWaterLogsResponse)
async def get_water_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort: str = Query("-created_at"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all water log entries for the current user"""
    service = Water_logsService(db)
    
    # Parse dates
    start = None
    end = None
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    items = await service.get_all(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        sort=sort,
        start_date=start,
        end_date=end
    )
    
    # Get total count
    all_items = await service.get_all(
        user_id=current_user.id,
        limit=10000,
        offset=0,
        start_date=start,
        end_date=end
    )
    
    return {
        "items": items,
        "total": len(all_items),
        "limit": limit,
        "offset": offset
    }


@router.get("/today", response_model=WaterLogSummaryResponse)
async def get_today_water_summary(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get today's water intake summary"""
    water_service = Water_logsService(db)
    profile_service = User_profilesService(db)
    
    # Get user's water target from profile
    profiles = await profile_service.get_all(user_id=current_user.id, limit=1)
    target_ml = 2000  # Default
    if profiles and hasattr(profiles[0], 'target_water_ml') and profiles[0].target_water_ml:
        target_ml = profiles[0].target_water_ml
    
    summary = await water_service.get_today_summary(current_user.id, target_ml)
    return summary


@router.get("/{log_id}", response_model=Water_logsResponse)
async def get_water_log(
    log_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific water log by ID"""
    service = Water_logsService(db)
    result = await service.get_by_id(log_id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Water log not found")
    return result


@router.patch("/{log_id}", response_model=Water_logsResponse)
async def update_water_log(
    log_id: int,
    data: Water_logsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a water log entry"""
    service = Water_logsService(db)
    
    # Check ownership
    if not await service.check_ownership(log_id, current_user.id):
        raise HTTPException(status_code=404, detail="Water log not found")
    
    result = await service.update(log_id, data.model_dump(exclude_unset=True), user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to update water log")
    return result


@router.delete("/{log_id}", status_code=204)
async def delete_water_log(
    log_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a water log entry"""
    service = Water_logsService(db)
    
    # Check ownership
    if not await service.check_ownership(log_id, current_user.id):
        raise HTTPException(status_code=404, detail="Water log not found")
    
    success = await service.delete(log_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete water log")
    return None