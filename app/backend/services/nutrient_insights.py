import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.meal_logs import Meal_logs
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)


class NutrientInsightsService:
    """Service for AI-powered nutrient insights and recommendations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_nutrient_summary(
        self, 
        user_id: str, 
        days: int = 7
    ) -> Dict[str, Any]:
        """Get nutrient summary for the past N days"""
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            query = select(Meal_logs).where(
                Meal_logs.user_id == user_id,
                Meal_logs.logged_at >= start_date
            )
            
            result = await self.db.execute(query)
            logs = result.scalars().all()
            
            # Aggregate nutrients
            totals = {
                'calories': 0, 'protein': 0, 'fat': 0, 'carbs': 0,
                'fiber_g': 0, 'sugar_g': 0, 'sodium_mg': 0,
                'vitamin_a_mcg': 0, 'vitamin_c_mg': 0, 'vitamin_d_mcg': 0,
                'vitamin_e_mg': 0, 'vitamin_b12_mcg': 0,
                'calcium_mg': 0, 'iron_mg': 0, 'magnesium_mg': 0,
                'potassium_mg': 0, 'zinc_mg': 0,
            }
            
            for log in logs:
                for key in totals:
                    if hasattr(log, key):
                        value = getattr(log, key)
                        if value is not None:
                            totals[key] += value
            
            # Get user profile for targets
            profile_query = select(User_profiles).where(
                User_profiles.user_id == user_id
            ).limit(1)
            profile_result = await self.db.execute(profile_query)
            profile = profile_result.scalar_one_or_none()
            
            targets = {}
            if profile:
                target_fields = [
                    'target_calories', 'target_protein', 'target_fat', 'target_carbs',
                    'target_fiber_g', 'target_sodium_mg', 'target_sugar_g',
                    'target_vitamin_a_mcg', 'target_vitamin_c_mg', 'target_vitamin_d_mcg',
                    'target_vitamin_e_mg', 'target_vitamin_b12_mcg',
                    'target_calcium_mg', 'target_iron_mg', 'target_magnesium_mg',
                    'target_potassium_mg', 'target_zinc_mg',
                ]
                for field in target_fields:
                    if hasattr(profile, field):
                        value = getattr(profile, field)
                        if value is not None:
                            targets[field.replace('target_', '')] = value
            
            return {
                'totals': totals,
                'targets': targets,
                'days': days,
                'entries_count': len(logs)
            }
        except Exception as e:
            logger.error(f"Error getting nutrient summary: {str(e)}")
            raise

    def generate_prompt_for_ai(self, summary: Dict[str, Any]) -> str:
        """Generate a prompt for AI analysis"""
        totals = summary.get('totals', {})
        targets = summary.get('targets', {})
        
        # Calculate percentages
        nutrient_status = []
        for nutrient, value in totals.items():
            target_key = f'target_{nutrient}' if nutrient not in ['calories', 'protein', 'fat', 'carbs'] else f'target_{nutrient}'
            target = targets.get(nutrient) or targets.get(target_key.replace('target_', ''))
            
            if target and target > 0:
                percentage = (value / target) * 100
                status = 'low' if percentage < 50 else 'normal' if percentage < 100 else 'high'
                nutrient_status.append({
                    'nutrient': nutrient,
                    'value': round(value, 1),
                    'target': target,
                    'percentage': round(percentage, 1),
                    'status': status
                })
        
        # Format for AI
        prompt = f"""Проанализируй данные о питании пользователя за последние {summary.get('days', 7)} дней.

Потребление нутриентов:
"""
        for item in nutrient_status:
            prompt += f"- {item['nutrient']}: {item['value']} (цель: {item['target']}, выполнено: {item['percentage']}%)\n"
        
        prompt += f"""
Всего записей о питании: {summary.get('entries_count', 0)}

Дай краткие персонализированные рекомендации (2-3 предложения) на русском языке:
1. Какие нутриенты в дефиците и какие продукты их содержат
2. Какие нутриенты в избытке и как их уменьшить
3. Общие советы по улучшению рациона

Отвечай кратко и по делу."""
        
        return prompt

    async def get_ai_insight(
        self,
        user_id: str,
        days: int = 7,
        model: str | None = None
    ) -> str:
        """Get AI-generated nutrient insight"""
        try:
            model = model or getattr(settings, "nutrient_insight_model", "openai/gpt-4o-mini")

            # Get nutrient summary
            summary = await self.get_user_nutrient_summary(user_id, days)
            
            # Generate prompt
            prompt = self.generate_prompt_for_ai(summary)
            
            # Call AI service
            from services.aihub import AIHubService
            from schemas.aihub import GenTxtRequest, ChatMessage
            
            ai_service = AIHubService()
            request = GenTxtRequest(
                messages=[
                    ChatMessage(
                        role="system", 
                        content="Ты - опытный нутрициолог и диетолог. Давай персонализированные советы по питанию на основе данных о потреблении нутриентов."
                    ),
                    ChatMessage(role="user", content=prompt)
                ],
                model=model
            )
            
            response = await ai_service.gentxt(request)
            return response.content
        except Exception as e:
            logger.error(f"Error getting AI insight: {str(e)}")
            return "Не удалось получить рекомендации. Попробуйте позже."