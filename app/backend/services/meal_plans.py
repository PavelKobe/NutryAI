import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.meal_plans import Meal_plans

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Meal_plansService:
    """Service layer for Meal_plans operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Meal_plans]:
        """Create a new meal_plans"""
        try:
            payload = dict(data or {})
            if user_id:
                payload['user_id'] = user_id
            if payload.get('created_at') is None:
                payload['created_at'] = datetime.now(timezone.utc)
            if payload.get('status') == 'active' and user_id:
                await self.db.execute(
                    update(Meal_plans)
                    .where(
                        Meal_plans.user_id == user_id,
                        Meal_plans.status == 'active',
                    )
                    .values(status='archived')
                )
            obj = Meal_plans(**payload)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created meal_plans with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating meal_plans: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for meal_plans {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Meal_plans]:
        """Get meal_plans by ID (user can only see their own records)"""
        try:
            query = select(Meal_plans).where(Meal_plans.id == obj_id)
            if user_id:
                query = query.where(Meal_plans.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching meal_plans {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of meal_planss (user can only see their own records)"""
        try:
            query = select(Meal_plans)
            count_query = select(func.count(Meal_plans.id))
            
            if user_id:
                query = query.where(Meal_plans.user_id == user_id)
                count_query = count_query.where(Meal_plans.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Meal_plans, field):
                        query = query.where(getattr(Meal_plans, field) == value)
                        count_query = count_query.where(getattr(Meal_plans, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Meal_plans, field_name):
                        col = getattr(Meal_plans, field_name)
                        query = query.order_by(col.desc(), Meal_plans.id.desc())
                else:
                    if hasattr(Meal_plans, sort):
                        query = query.order_by(getattr(Meal_plans, sort), Meal_plans.id.desc())
            else:
                query = query.order_by(Meal_plans.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching meal_plans list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Meal_plans]:
        """Update meal_plans (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Meal_plans {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated meal_plans {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating meal_plans {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete meal_plans (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Meal_plans {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted meal_plans {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting meal_plans {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Meal_plans]:
        """Get meal_plans by any field"""
        try:
            if not hasattr(Meal_plans, field_name):
                raise ValueError(f"Field {field_name} does not exist on Meal_plans")
            result = await self.db.execute(
                select(Meal_plans).where(getattr(Meal_plans, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching meal_plans by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Meal_plans]:
        """Get list of meal_planss filtered by field"""
        try:
            if not hasattr(Meal_plans, field_name):
                raise ValueError(f"Field {field_name} does not exist on Meal_plans")
            result = await self.db.execute(
                select(Meal_plans)
                .where(getattr(Meal_plans, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Meal_plans.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching meal_planss by {field_name}: {str(e)}")
            raise