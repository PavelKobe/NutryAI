import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import MealPlanSkeleton from '@/components/skeletons/MealPlanSkeleton';
import { Sparkles, RefreshCw, ChefHat, Clock, Flame, Image as ImageIcon, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';

interface MealPlanData {
  id?: number;
  plan_data: string;
  week_start: string;
  status: string;
}

interface DayPlan {
  day: string;
  meals: {
    type: string;
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    cooking_time: number;
    image_url?: string;
  }[];
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

const DAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function MealPlan() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());

  const saveRecipe = async (dayIndex: number, mealIndex: number) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    const key = `${dayIndex}-${mealIndex}`;
    setSavingRecipe(key);
    try {
      await client.entities.recipes.create({
        data: {
          title: meal.name,
          description: `${MEAL_LABELS[meal.type] || meal.type} — ${plan?.[dayIndex]?.day || ''}`,
          calories: meal.calories,
          protein: meal.protein,
          fat: meal.fat,
          carbs: meal.carbs,
          cooking_time: meal.cooking_time || 20,
          servings: 1,
          image_url: meal.image_url || '',
          cuisine: 'Русская',
        },
      });
      setSavedRecipes((prev) => new Set(prev).add(key));
      toast.success(`«${meal.name}» сохранён в рецепты!`);
    } catch {
      toast.error('Не удалось сохранить рецепт');
    } finally {
      setSavingRecipe(null);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const res = await client.entities.meal_plans.query({
        query: { status: 'active' },
        sort: '-created_at',
        limit: 1,
      });
      const plans: MealPlanData[] = res?.data?.items || [];
      if (plans.length > 0 && plans[0].plan_data) {
        try {
          const parsed = JSON.parse(plans[0].plan_data);
          setPlan(parsed);
        } catch {
          setPlan(null);
        }
      }
    } catch (err) {
      console.error('Load plan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const profileRes = await client.entities.user_profiles.query({ limit: 1 });
      const profiles = profileRes?.data?.items || [];
      if (profiles.length === 0) {
        toast.error('Сначала заполните профиль');
        return;
      }
      const p = profiles[0];

      const prompt = `Составь план питания на 7 дней на русском языке. Верни ТОЛЬКО JSON-массив без markdown.
Параметры пользователя:
- Цель: ${p.goal === 'lose' ? 'похудение' : p.goal === 'gain' ? 'набор массы' : 'поддержание веса'}
- Калории: ${p.target_calories} ккал/день
- Белки: ${p.target_protein}г, Жиры: ${p.target_fat}г, Углеводы: ${p.target_carbs}г
- Аллергии: ${p.allergies || 'нет'}
- Кухня: ${p.cuisine_preferences || 'Русская'}
- Бюджет: ${p.budget_per_week || 3000}₽/неделя
- Время готовки: до ${p.cooking_time_minutes || 30} минут

Формат JSON:
[{"day":"Понедельник","meals":[{"type":"breakfast","name":"Название блюда","calories":350,"protein":20,"fat":12,"carbs":40,"cooking_time":15},{"type":"lunch","name":"...","calories":450,"protein":30,"fat":15,"carbs":50,"cooking_time":25},{"type":"dinner","name":"...","calories":400,"protein":28,"fat":14,"carbs":42,"cooking_time":30},{"type":"snack","name":"...","calories":150,"protein":8,"fat":5,"carbs":18,"cooking_time":5}]}]
Используй российские продукты и блюда. Ровно 7 дней.`;

      let fullText = '';
      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'Ты — профессиональный нутрициолог. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.' },
          { role: 'user', content: prompt },
        ],
        model: 'gpt-5-chat',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          fullText += chunk.content || '';
        },
        onComplete: async () => {
          try {
            let jsonStr = fullText.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            const parsed: DayPlan[] = JSON.parse(jsonStr);
            setPlan(parsed);

            const today = new Date().toISOString().split('T')[0];
            await client.entities.meal_plans.create({
              data: {
                plan_data: JSON.stringify(parsed),
                week_start: today,
                status: 'active',
              },
            });
            toast.success('План питания сгенерирован!');
          } catch {
            toast.error('Ошибка парсинга плана. Попробуйте ещё раз.');
          }
        },
        onError: (error: { message?: string }) => {
          toast.error(error?.message || 'Ошибка генерации плана');
        },
      });
    } catch {
      toast.error('Не удалось сгенерировать план');
    } finally {
      setGenerating(false);
    }
  };

  const generateMealImage = async (dayIndex: number, mealIndex: number, mealName: string) => {
    const key = `${dayIndex}-${mealIndex}`;
    setGeneratingImage(key);
    try {
      const response = await client.ai.genimg(
        {
          prompt: `Аппетитная фотография блюда "${mealName}". Вид сверху, красивая сервировка на тарелке, профессиональная food-фотография, тёплое освещение, высокое качество.`,
          model: 'gemini-2.5-flash-image',
          size: '1024x1024',
          n: 1,
        },
        { timeout: 600_000 }
      );

      const imageUrl = response?.data?.images?.[0];
      if (imageUrl && plan) {
        const updatedPlan = [...plan];
        updatedPlan[dayIndex].meals[mealIndex].image_url = imageUrl;
        setPlan(updatedPlan);
        toast.success('Изображение сгенерировано!');
      }
    } catch {
      toast.error('Не удалось сгенерировать изображение');
    } finally {
      setGeneratingImage(null);
    }
  };

  if (loading) {
    return (
      <AppLayout title="План питания">
        <MealPlanSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="План питания">
      <div className="space-y-5">
        {/* Generate Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-400" /> Недельный план
          </h2>
          <Button
            onClick={() => navigate('/saved-recipes')}
            size="sm"
            variant="ghost"
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
          >
            <BookmarkCheck className="w-4 h-4 mr-1" /> Рецепты
          </Button>
          <Button
            onClick={generatePlan}
            disabled={generating}
            size="sm"
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl"
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Генерация...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> {plan ? 'Обновить' : 'Сгенерировать'}</>
            )}
          </Button>
        </div>

        {!plan ? (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">
              У вас ещё нет плана питания. Нажмите «Сгенерировать», чтобы ИИ составил план на неделю.
            </p>
          </div>
        ) : (
          <>
            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {plan.map((day, i) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedDay === i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {day.day?.slice(0, 2) || DAYS_RU[i]?.slice(0, 2)}
                </button>
              ))}
            </div>

            {/* Selected Day Meals */}
            <div className="space-y-3">
              <h3 className="font-semibold text-emerald-400">
                {plan[selectedDay]?.day || DAYS_RU[selectedDay]}
              </h3>
              {(plan[selectedDay]?.meals || []).map((meal, i) => {
                const imgKey = `${selectedDay}-${i}`;
                return (
                  <div
                    key={`${meal.type}-${i}`}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50"
                  >
                    {/* Meal image */}
                    {meal.image_url && (
                      <div className="mb-3 rounded-xl overflow-hidden">
                        <img
                          src={meal.image_url}
                          alt={meal.name}
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        {MEAL_EMOJI[meal.type] || '🍽️'}{' '}
                        {MEAL_LABELS[meal.type] || meal.type}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveRecipe(selectedDay, i)}
                          disabled={savingRecipe === imgKey || savedRecipes.has(imgKey)}
                          className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 ${
                            savedRecipes.has(imgKey)
                              ? 'text-emerald-400'
                              : 'text-slate-500 hover:text-emerald-400'
                          }`}
                          title={savedRecipes.has(imgKey) ? 'Сохранено' : 'Сохранить рецепт'}
                        >
                          {savedRecipes.has(imgKey) ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : savingRecipe === imgKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => generateMealImage(selectedDay, i, meal.name)}
                          disabled={generatingImage === imgKey}
                          className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-purple-400 disabled:opacity-50"
                          title="Сгенерировать изображение"
                        >
                          {generatingImage === imgKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" /> {meal.cooking_time || 20} мин
                        </div>
                      </div>
                    </div>
                    <p className="font-medium text-white mb-2">{meal.name}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-3 h-3" /> {meal.calories} ккал
                      </span>
                      <span className="text-red-400">Б{meal.protein}г</span>
                      <span className="text-amber-400">Ж{meal.fat}г</span>
                      <span className="text-blue-400">У{meal.carbs}г</span>
                    </div>
                  </div>
                );
              })}
              {/* Day total */}
              {plan[selectedDay]?.meals && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-sm text-emerald-400 font-medium">
                    Итого за день:{' '}
                    {plan[selectedDay].meals.reduce((s, m) => s + (m.calories || 0), 0)} ккал
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}