import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_admin_user, get_current_user
from schemas.auth import UserResponse
from services.recipes import RecipesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/recipes", tags=["recipes"])


# ---------- Pydantic Schemas ----------
class RecipesData(BaseModel):
    """Entity data schema (for create/update)"""
    title: str = None
    description: str = None
    cuisine: str = None
    calories: int = None
    protein: int = None
    fat: int = None
    carbs: int = None
    cooking_time: int = None
    servings: int = None
    ingredients: str = None
    instructions: str = None
    image_url: str = None
    created_at: Optional[datetime] = None


class RecipesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    title: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    calories: Optional[int] = None
    protein: Optional[int] = None
    fat: Optional[int] = None
    carbs: Optional[int] = None
    cooking_time: Optional[int] = None
    servings: Optional[int] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None


class RecipesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    calories: Optional[int] = None
    protein: Optional[int] = None
    fat: Optional[int] = None
    carbs: Optional[int] = None
    cooking_time: Optional[int] = None
    servings: Optional[int] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecipesListResponse(BaseModel):
    """List response schema"""
    items: List[RecipesResponse]
    total: int
    skip: int
    limit: int


class RecipesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[RecipesData]


class RecipesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: RecipesUpdateData


class RecipesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[RecipesBatchUpdateItem]


class RecipesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=RecipesListResponse)
async def query_recipess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query recipes for the authenticated user only."""
    logger.debug(f"Querying recipess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = RecipesService(db)
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
            user_id=str(current_user.id),
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} recipess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying recipess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=RecipesListResponse)
async def query_recipess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """All recipes (admin only, no user filter)."""
    logger.debug(f"Admin querying all recipess: query={query}, sort={sort}, skip={skip}, limit={limit}")

    service = RecipesService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            user_id=None,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} recipess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying recipess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=RecipesResponse)
async def get_recipes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single recipe by ID (owner only)."""
    logger.debug(f"Fetching recipes with id: {id}, fields={fields}")
    
    service = RecipesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Recipes with id {id} not found")
            raise HTTPException(status_code=404, detail="Recipes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=RecipesResponse, status_code=201)
async def create_recipes(
    data: RecipesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new recipe for the current user."""
    logger.debug(f"Creating new recipes with data: {data}")
    
    service = RecipesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create recipes")
        
        logger.info(f"Recipes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating recipes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating recipes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[RecipesResponse], status_code=201)
async def create_recipess_batch(
    request: RecipesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple recipes in a single request (all owned by current user)."""
    logger.debug(f"Batch creating {len(request.items)} recipess")
    
    service = RecipesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} recipess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[RecipesResponse])
async def update_recipess_batch(
    request: RecipesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple recipes (owner only)."""
    logger.debug(f"Batch updating {len(request.items)} recipess")
    
    service = RecipesService(db)
    results = []
    
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} recipess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=RecipesResponse)
async def update_recipes(
    id: int,
    data: RecipesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing recipe (owner only)."""
    logger.debug(f"Updating recipes {id} with data: {data}")

    service = RecipesService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Recipes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Recipes not found")
        
        logger.info(f"Recipes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating recipes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_recipess_batch(
    request: RecipesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple recipes by ID (owner only)."""
    logger.debug(f"Batch deleting {len(request.ids)} recipess")
    
    service = RecipesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} recipess successfully")
        return {"message": f"Successfully deleted {deleted_count} recipess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_recipes(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single recipe by ID (owner only)."""
    logger.debug(f"Deleting recipes with id: {id}")
    
    service = RecipesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Recipes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Recipes not found")
        
        logger.info(f"Recipes {id} deleted successfully")
        return {"message": "Recipes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")