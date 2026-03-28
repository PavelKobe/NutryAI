import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.water_logs import Water_logs

logger = logging.getLogger(__name__)


class Water_logsService:
    """Service layer for Water_logs operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Water_logs]:
        """Create a new water log entry"""
        try:
            if user_id:
                data['user_id'] = user_id
            if 'logged_at' not in data or data['logged_at'] is None:
                data['logged_at'] = datetime.utcnow()
            if 'created_at' not in data:
                data['created_at'] = datetime.utcnow()
            
            obj = Water_logs(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created water_log with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating water_log: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for water_log {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Water_logs]:
        """Get water_log by ID (user can only see their own records)"""
        try:
            query = select(Water_logs).where(Water_logs.id == obj_id)
            if user_id:
                query = query.where(Water_logs.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting water_log by id {obj_id}: {str(e)}")
            raise

    async def get_all(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0,
        sort: str = "-created_at",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Water_logs]:
        """Get all water logs for a user with optional date filtering"""
        try:
            query = select(Water_logs).where(Water_logs.user_id == user_id)
            
            if start_date:
                query = query.where(Water_logs.logged_at >= start_date)
            if end_date:
                query = query.where(Water_logs.logged_at <= end_date)
            
            # Sorting
            if sort.startswith("-"):
                sort_col = sort[1:]
                order = False
            else:
                sort_col = sort
                order = True
            
            if hasattr(Water_logs, sort_col):
                query = query.order_by(
                    getattr(Water_logs, sort_col).desc() if not order else getattr(Water_logs, sort_col)
                )
            
            query = query.offset(offset).limit(limit)
            result = await self.db.execute(query)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error getting water_logs: {str(e)}")
            raise

    async def get_today_summary(self, user_id: str, target_ml: int = 2000) -> Dict[str, Any]:
        """Get today's water intake summary"""
        try:
            today = date.today()
            start_of_day = datetime.combine(today, datetime.min.time())
            end_of_day = datetime.combine(today, datetime.max.time())
            
            query = select(
                func.count(Water_logs.id).label("entries_count"),
                func.coalesce(func.sum(Water_logs.amount_ml), 0).label("total_ml")
            ).where(
                Water_logs.user_id == user_id
            ).where(
                Water_logs.logged_at >= start_of_day
            ).where(
                Water_logs.logged_at <= end_of_day
            )
            
            result = await self.db.execute(query)
            row = result.one()
            
            total_ml = int(row.total_ml)
            entries_count = int(row.entries_count)
            percentage = (total_ml / target_ml * 100) if target_ml > 0 else 0
            
            return {
                "total_ml": total_ml,
                "target_ml": target_ml,
                "percentage": round(percentage, 1),
                "entries_count": entries_count,
                "date": today.isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting today's water summary: {str(e)}")
            raise

    async def update(
        self,
        obj_id: int,
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Optional[Water_logs]:
        """Update a water log"""
        try:
            obj = await self.get_by_id(obj_id, user_id)
            if not obj:
                return None
            
            for key, value in data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated water_log {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating water_log {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete a water log"""
        try:
            obj = await self.get_by_id(obj_id, user_id)
            if not obj:
                return False
            
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted water_log {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting water_log {obj_id}: {str(e)}")
            raise