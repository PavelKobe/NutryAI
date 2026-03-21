import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.recipes import Recipes

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class RecipesService:
    """Service layer for Recipes operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Recipes]:
        """Create a new recipes"""
        try:
            obj = Recipes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created recipes with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating recipes: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Recipes]:
        """Get recipes by ID"""
        try:
            query = select(Recipes).where(Recipes.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching recipes {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of recipess"""
        try:
            query = select(Recipes)
            count_query = select(func.count(Recipes.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Recipes, field):
                        query = query.where(getattr(Recipes, field) == value)
                        count_query = count_query.where(getattr(Recipes, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Recipes, field_name):
                        query = query.order_by(getattr(Recipes, field_name).desc())
                else:
                    if hasattr(Recipes, sort):
                        query = query.order_by(getattr(Recipes, sort))
            else:
                query = query.order_by(Recipes.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching recipes list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Recipes]:
        """Update recipes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Recipes {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated recipes {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating recipes {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete recipes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Recipes {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted recipes {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting recipes {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Recipes]:
        """Get recipes by any field"""
        try:
            if not hasattr(Recipes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Recipes")
            result = await self.db.execute(
                select(Recipes).where(getattr(Recipes, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching recipes by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Recipes]:
        """Get list of recipess filtered by field"""
        try:
            if not hasattr(Recipes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Recipes")
            result = await self.db.execute(
                select(Recipes)
                .where(getattr(Recipes, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Recipes.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching recipess by {field_name}: {str(e)}")
            raise