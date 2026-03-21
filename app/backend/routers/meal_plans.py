import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.meal_plans import Meal_plansService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/meal_plans", tags=["meal_plans"])


# ---------- Pydantic Schemas ----------
class Meal_plansData(BaseModel):
    """Entity data schema (for create/update)"""
    plan_data: str = None
    week_start: str = None
    status: str = None
    created_at: Optional[datetime] = None


class Meal_plansUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    plan_data: Optional[str] = None
    week_start: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class Meal_plansResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    plan_data: Optional[str] = None
    week_start: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Meal_plansListResponse(BaseModel):
    """List response schema"""
    items: List[Meal_plansResponse]
    total: int
    skip: int
    limit: int


class Meal_plansBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Meal_plansData]


class Meal_plansBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Meal_plansUpdateData


class Meal_plansBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Meal_plansBatchUpdateItem]


class Meal_plansBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Meal_plansListResponse)
async def query_meal_planss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query meal_planss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying meal_planss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Meal_plansService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} meal_planss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying meal_planss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Meal_plansListResponse)
async def query_meal_planss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query meal_planss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying meal_planss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Meal_plansService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} meal_planss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying meal_planss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Meal_plansResponse)
async def get_meal_plans(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single meal_plans by ID (user can only see their own records)"""
    logger.debug(f"Fetching meal_plans with id: {id}, fields={fields}")
    
    service = Meal_plansService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Meal_plans with id {id} not found")
            raise HTTPException(status_code=404, detail="Meal_plans not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching meal_plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Meal_plansResponse, status_code=201)
async def create_meal_plans(
    data: Meal_plansData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new meal_plans"""
    logger.debug(f"Creating new meal_plans with data: {data}")
    
    service = Meal_plansService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create meal_plans")
        
        logger.info(f"Meal_plans created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating meal_plans: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating meal_plans: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Meal_plansResponse], status_code=201)
async def create_meal_planss_batch(
    request: Meal_plansBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple meal_planss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} meal_planss")
    
    service = Meal_plansService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} meal_planss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Meal_plansResponse])
async def update_meal_planss_batch(
    request: Meal_plansBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple meal_planss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} meal_planss")
    
    service = Meal_plansService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} meal_planss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Meal_plansResponse)
async def update_meal_plans(
    id: int,
    data: Meal_plansUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing meal_plans (requires ownership)"""
    logger.debug(f"Updating meal_plans {id} with data: {data}")

    service = Meal_plansService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Meal_plans with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Meal_plans not found")
        
        logger.info(f"Meal_plans {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating meal_plans {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating meal_plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_meal_planss_batch(
    request: Meal_plansBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple meal_planss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} meal_planss")
    
    service = Meal_plansService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} meal_planss successfully")
        return {"message": f"Successfully deleted {deleted_count} meal_planss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_meal_plans(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single meal_plans by ID (requires ownership)"""
    logger.debug(f"Deleting meal_plans with id: {id}")
    
    service = Meal_plansService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Meal_plans with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Meal_plans not found")
        
        logger.info(f"Meal_plans {id} deleted successfully")
        return {"message": "Meal_plans deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meal_plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")