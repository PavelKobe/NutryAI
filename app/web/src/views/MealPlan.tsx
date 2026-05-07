'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { localDateKeyFromLoggedAt, localTodayKey } from '@/lib/date_local';
import { mealLogsTodayQueryKey } from '@/lib/queries/meal_logs_today';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import MealPlanSkeleton from '@/components/skeletons/MealPlanSkeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  RefreshCw,
  ChefHat,
  Clock,
  Flame,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Pencil,
  BookOpen,
  Copy,
  ShoppingCart,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import UpgradeSubscriptionModal, { type UpgradeTrigger } from '@/components/subscription/UpgradeSubscriptionModal';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface MealPlanData {
  id?: number;
  plan_data: string;
  week_start: string;
  status: string;
}

interface MealRecipe {
  ingredients: string;
  instructions: string;
  tips?: string;
  nutritional_notes?: string;
}

interface MealItem {
  type: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  cooking_time: number;
  image_url?: string;
  recipe?: MealRecipe;
}

interface DayPlan {
  day: string;
  meals: MealItem[];
}

interface ShoppingItem {
  name: string;
  amount: string;
  have: boolean;
}

interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
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

const MEAL_DISTRIBUTION: Record<string, { min: number; max: number }> = {
  breakfast: { min: 0.25, max: 0.30 },
  lunch:     { min: 0.30, max: 0.35 },
  dinner:    { min: 0.25, max: 0.30 },
  snack:     { min: 0.10, max: 0.15 },
};

const DAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function MealPlan() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // План от ИИ: индекс 0 = Пн … 6 = Вс.
  const jsDay = new Date().getDay(); // локально: 0 = Вс … 6 = Сб
  const todayPlanDayIndex = jsDay === 0 ? 6 : jsDay - 1; // Пн = 0 … Вс = 6

  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayPlanDayIndex);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [planLoggedMeals, setPlanLoggedMeals] = useState<Record<string, number>>({});
  const [savingCheckbox, setSavingCheckbox] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitTrigger, setLimitTrigger] = useState<UpgradeTrigger>('limit');
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);
  const [recipeViewerOpen, setRecipeViewerOpen] = useState(false);
  const [recipeViewerDay, setRecipeViewerDay] = useState(0);
  const [recipeViewerMeal, setRecipeViewerMeal] = useState(0);
  const [generatingForViewer, setGeneratingForViewer] = useState<string | null>(null);
  const planRef = useRef<DayPlan[] | null>(null);
  const [mealEditorOpen, setMealEditorOpen] = useState(false);
  const [editDayIndex, setEditDayIndex] = useState(0);
  const [editMealIndex, setEditMealIndex] = useState(0);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editCookingTime, setEditCookingTime] = useState('');
  const [useMyProducts, setUseMyProducts] = useState(false);
  const [copyTemplateDay, setCopyTemplateDay] = useState<number | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<Set<number>>(new Set());
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [shoppingDays, setShoppingDays] = useState<Set<number>>(new Set([0,1,2,3,4,5,6]));
  const [shoppingList, setShoppingList] = useState<ShoppingCategory[] | null>(null);
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const handleSubscriptionError = (trigger: UpgradeTrigger) => {
    setLimitTrigger(trigger);
    setShowLimitModal(true);
  };

  const persistPlan = useCallback(async (nextPlan: DayPlan[]): Promise<boolean> => {
    if (activePlanId == null) return false;
    try {
      await client.entities.meal_plans.update({
        id: String(activePlanId),
        data: { plan_data: JSON.stringify(nextPlan) },
      });
      return true;
    } catch {
      toast.error('Не удалось сохранить план');
      return false;
    }
  }, [activePlanId]);

  const handleApplyTemplate = useCallback(async () => {
    if (copyTemplateDay === null || !plan) return;
    const sourceMeals = plan[copyTemplateDay].meals;
    const newPlan = plan.map((day, i) =>
      copyTargetDays.has(i)
        ? { ...day, meals: sourceMeals.map(m => ({ ...m, image_url: undefined, recipe: undefined })) }
        : day,
    );
    setPlan(newPlan);
    setCopyPopoverOpen(false);
    const count = copyTargetDays.size;
    setCopyTargetDays(new Set());
    const ok = await persistPlan(newPlan);
    if (ok) toast.success(`Меню скопировано на ${count} ${count === 1 ? 'день' : count < 5 ? 'дня' : 'дней'}`);
  }, [copyTemplateDay, copyTargetDays, plan, persistPlan]);

  const generateShoppingList = useCallback(async () => {
    if (!plan || shoppingDays.size === 0) return;
    setGeneratingShoppingList(true);
    setShoppingList(null);
    setCheckedItems(new Set());

    try {
      const days = plan.filter((_, i) => shoppingDays.has(i));

      const mealsText = days.map(d =>
        `${d.day}:\n` + d.meals.map(m => `- ${m.name}`).join('\n')
      ).join('\n\n');

      let userProductNames: string[] = [];
      try {
        const res = await client.entities.user_products.query({ limit: 200, sort: '-created_at' });
        const items = (res as { data?: { items?: { custom_name?: string; product?: { name: string } }[] } })?.data?.items ?? [];
        userProductNames = items.map((p: { custom_name?: string; product?: { name: string } }) => p.custom_name || p.product?.name || '').filter(Boolean);
      } catch { /* нет продуктов — не критично */ }

      const userProductsSection = userProductNames.length > 0
        ? `\nПродукты которые уже есть у пользователя (отметь have=true):\n${userProductNames.join(', ')}`
        : '';

      const prompt = `Составь список продуктов для покупки для следующих блюд.
${mealsText}
${userProductsSection}

Верни ТОЛЬКО JSON без markdown:
{
  "categories": [
    {
      "category": "Название категории на русском",
      "items": [
        { "name": "Название продукта", "amount": "количество с единицей измерения", "have": false }
      ]
    }
  ]
}

Правила:
- Группируй по категориям: Мясо и птица, Рыба и морепродукты, Молочные продукты, Крупы и злаки, Овощи, Фрукты, Бобовые, Хлеб и выпечка, Масла и соусы, Специи и приправы, Прочее
- Суммируй одинаковые продукты если встречаются в нескольких блюдах
- amount указывай в граммах/мл/штуках (например: "600г", "500мл", "3 шт")
- have=true если продукт есть в списке пользователя (сравни по смыслу)
- Не включай воду, соль, перец как отдельные пункты`;

      let fullText = '';
      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'Ты — помощник по планированию питания. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => { fullText += chunk.content || ''; },
        onComplete: async () => {
          try {
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid JSON');
            const parsed = JSON.parse(jsonMatch[0]);
            setShoppingList(parsed.categories ?? []);
          } catch {
            toast.error('Не удалось разобрать ответ ИИ');
          } finally {
            setGeneratingShoppingList(false);
          }
        },
      });
    } catch {
      toast.error('Не удалось составить список покупок');
    } finally {
      setGeneratingShoppingList(false);
    }
  }, [plan, shoppingDays]);

  const loadPlan = useCallback(async () => {
    try {
      const [planOutcome, logsOutcome] = await Promise.allSettled([
        client.entities.meal_plans.query({
          query: { status: 'active' },
          sort: '-created_at',
          limit: 1,
        }),
        client.entities.meal_logs.query({ sort: '-created_at', limit: 50 }),
      ]);

      const planRes =
        planOutcome.status === 'fulfilled' ? planOutcome.value : null;
      const logsRes =
        logsOutcome.status === 'fulfilled' ? logsOutcome.value : null;

      if (planOutcome.status === 'rejected') {
        console.error('meal_plans query failed:', planOutcome.reason);
        toast.error('Не удалось загрузить план питания (ошибка сервера)');
      }
      if (logsOutcome.status === 'rejected') {
        console.error('meal_logs query failed:', logsOutcome.reason);
      }

      const rawPlans = planRes?.data?.items ?? planRes?.data;
      const plans: MealPlanData[] = Array.isArray(rawPlans) ? rawPlans : [];
      if (plans.length > 0 && plans[0].plan_data) {
        try {
          const parsed: DayPlan[] = JSON.parse(plans[0].plan_data);
          setPlan(parsed);
          setWeekStart(plans[0].week_start || null);
          const pid = plans[0].id;
          setActivePlanId(typeof pid === 'number' ? pid : null);

          const today = localTodayKey();
          const rawItems = logsRes?.data?.items ?? logsRes?.data ?? [];
          const itemsList = Array.isArray(rawItems) ? rawItems : [];
          const todayLogs: { id: number; meal_type: string; food_name: string; logged_at: string }[] =
            itemsList.filter(
              (l: { logged_at?: string }) => localDateKeyFromLoggedAt(l.logged_at) === today,
            );

          const logMap: Record<string, number> = {};
          for (const log of todayLogs) {
            logMap[`${log.meal_type}:${log.food_name}`] = log.id;
          }

          const restored: Record<string, number> = {};
          (parsed[todayPlanDayIndex]?.meals || []).forEach((meal, i) => {
            const id = logMap[`${meal.type}:${meal.name}`];
            if (id) restored[`${todayPlanDayIndex}-${i}`] = id;
          });
          setPlanLoggedMeals(restored);
        } catch {
          setPlan(null);
          setActivePlanId(null);
          setPlanLoggedMeals({});
        }
      } else {
        setPlan(null);
        setWeekStart(null);
        setActivePlanId(null);
        setPlanLoggedMeals({});
      }
    } catch (err) {
      console.error('Load plan error:', err);
    } finally {
      setLoading(false);
    }
  }, [todayPlanDayIndex]);

  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== '/meal-plan') return;
    void loadPlan();
  }, [pathname, loadPlan]);

  const openMealEditor = (dayIndex: number, mealIndex: number) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    setEditDayIndex(dayIndex);
    setEditMealIndex(mealIndex);
    setEditName(meal.name);
    setEditCalories(String(meal.calories ?? ''));
    setEditProtein(String(meal.protein ?? ''));
    setEditFat(String(meal.fat ?? ''));
    setEditCarbs(String(meal.carbs ?? ''));
    setEditCookingTime(String(meal.cooking_time ?? ''));
    setMealEditorOpen(true);
  };

  const saveEditedMeal = async () => {
    if (!plan) return;
    const name = editName.trim();
    if (!name) {
      toast.error('Укажите название блюда');
      return;
    }
    const calories = Number(editCalories) || 0;
    const protein = Number(editProtein) || 0;
    const fat = Number(editFat) || 0;
    const carbs = Number(editCarbs) || 0;
    const cooking_time = Number(editCookingTime) || 0;

    const updatedPlan = plan.map((day, di) => {
      if (di !== editDayIndex) return day;
      return {
        ...day,
        meals: day.meals.map((m, mi) =>
          mi === editMealIndex
            ? { ...m, name, calories, protein, fat, carbs, cooking_time }
            : m,
        ),
      };
    });
    setPlan(updatedPlan);
    setMealEditorOpen(false);
    const ok = await persistPlan(updatedPlan);
    if (ok) toast.success('Блюдо обновлено');
  };

  const toggleMealLogged = async (dayIndex: number, mealIndex: number, checked: boolean) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    const key = `${dayIndex}-${mealIndex}`;
    setSavingCheckbox(key);
    try {
      if (checked) {
        const res = await client.entities.meal_logs.create({
          data: {
            food_name: meal.name,
            meal_type: meal.type,
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            fat: meal.fat || 0,
            carbs: meal.carbs || 0,
            logged_at: new Date().toISOString(),
          },
        });
        const id = res?.data?.id;
        if (id) setPlanLoggedMeals((prev) => ({ ...prev, [key]: id }));
        await queryClient.invalidateQueries({ queryKey: [...mealLogsTodayQueryKey] });
        void queryClient.refetchQueries({ queryKey: [...mealLogsTodayQueryKey] });
        queryClient.invalidateQueries({ queryKey: ['meal_logs_analytics'] });
      } else {
        const id = planLoggedMeals[key];
        if (id) {
          await client.entities.meal_logs.delete({ id: String(id) });
          setPlanLoggedMeals((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          await queryClient.invalidateQueries({ queryKey: [...mealLogsTodayQueryKey] });
          void queryClient.refetchQueries({ queryKey: [...mealLogsTodayQueryKey] });
          queryClient.invalidateQueries({ queryKey: ['meal_logs_analytics'] });
        }
      }
    } catch {
      toast.error('Не удалось обновить дневник питания');
    } finally {
      setSavingCheckbox(null);
    }
  };

  // Сохранение рецепта с автоматической генерацией подробного рецепта
  const saveRecipe = async (dayIndex: number, mealIndex: number) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    const key = `${dayIndex}-${mealIndex}`;
    
    // Если рецепт уже сгенерирован, просто сохраняем
    if (meal.recipe) {
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
            ingredients: meal.recipe.ingredients,
            instructions: meal.recipe.instructions,
          },
        });
        setSavedRecipes((prev) => new Set(prev).add(key));
        toast.success(`«${meal.name}» сохранён в рецепты!`);
      } catch {
        toast.error('Не удалось сохранить рецепт');
      } finally {
        setSavingRecipe(null);
      }
    } else {
      // Если рецепта нет - генерируем его
      await generateRecipeForMeal(dayIndex, mealIndex);
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

      // Загружаем список продуктов пользователя если включена опция
      let productsSection = '';
      if (useMyProducts) {
        try {
          const productsRes = await client.entities.user_products.query({ limit: 50, sort: '-is_favorite' });
          const products: Array<{
            custom_name?: string;
            is_favorite?: boolean;
            product?: { name?: string; brand?: string; category?: string; nutrition_100g?: { calories?: number } };
          }> = productsRes?.data?.items ?? [];

          if (products.length > 0) {
            const lines = products.map((up) => {
              const name = up.custom_name || up.product?.name || 'Продукт';
              const brand = up.product?.brand ? ` (${up.product.brand})` : '';
              const kcal = up.product?.nutrition_100g?.calories
                ? `, ${Math.round(up.product.nutrition_100g.calories)} ккал/100г`
                : '';
              const fav = up.is_favorite ? ' ⭐' : '';
              return `- ${name}${brand}${kcal}${fav}`;
            });
            productsSection = `\nПредпочтительные продукты пользователя (отмеченные ⭐ — любимые; используй эти продукты в блюдах когда уместно, но не ограничивайся только ими):\n${lines.join('\n')}\n`;
          }
        } catch {
          // Не удалось загрузить продукты — продолжаем без них
        }
      }

      const tc = p.target_calories || 2000;
      const tcMin = tc - 100;
      const tcMax = tc + 100;
      const prompt = `Составь план питания на 7 дней на русском языке. Верни ТОЛЬКО JSON-массив без markdown.
Параметры пользователя:
- Цель: ${p.goal === 'lose' ? 'похудение' : p.goal === 'gain' ? 'набор массы' : 'поддержание веса'}
- Суточная норма калорий: ${tc} ккал/день — это ЦЕЛЕВОЙ показатель из профиля пользователя.
- ВАЖНО: Для КАЖДОГО из 7 дней рассчитай сумму калорий всех блюд (завтрак + обед + ужин + перекус), затем вычисли остаток: остаток = ${tc} (целевое) - сумма_ккал_блюд. Этот остаток ДОЛЖЕН быть в диапазоне от -100 до +100 ккал.
- Другими словами, сумма калорий всех блюд за день должна быть в диапазоне от ${tcMin} до ${tcMax} ккал (допуск ±100 ккал от целевого ${tc}).
- Распределение калорий по приёмам на день: завтрак ~25–30%, обед ~30–35%, ужин ~25–30%, перекус ~10–15% от суточной нормы.
- Белки за день в сумме близки к ${p.target_protein}г, жиры к ${p.target_fat}г, углеводы к ${p.target_carbs}г (согласуй с калориями).
- Аллергии: ${p.allergies || 'нет'}
- Кухня: ${p.cuisine_preferences || 'Русская'}
- Бюджет: ${p.budget_per_week || 3000}₽/неделя
- Время готовки: до ${p.cooking_time_minutes || 30} минут
${productsSection}
Формат JSON:
[{"day":"Понедельник","meals":[{"type":"breakfast","name":"Название блюда","calories":350,"protein":20,"fat":12,"carbs":40,"cooking_time":15},{"type":"lunch","name":"...","calories":450,"protein":30,"fat":15,"carbs":50,"cooking_time":25},{"type":"dinner","name":"...","calories":400,"protein":28,"fat":14,"carbs":42,"cooking_time":30},{"type":"snack","name":"...","calories":150,"protein":8,"fat":5,"carbs":18,"cooking_time":5}]}]
Используй российские продукты и блюда. Ровно 7 дней. Проверь, что для каждого дня остаток (целевое ${tc} - сумма ккал блюд) находится в диапазоне от -100 до +100 ккал; ответ — только валидный JSON без markdown.`;

      let fullText = '';
      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'Ты — профессиональный нутрициолог. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-4o',
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
            const today = localTodayKey();
            setPlan(parsed);
            setWeekStart(today);

            const createRes = await client.entities.meal_plans.create({
              data: {
                plan_data: JSON.stringify(parsed),
                week_start: today,
                status: 'active',
              },
            });
            const newId =
              (createRes as { data?: { id?: number } })?.data?.id ??
              (createRes as { data?: { data?: { id?: number } } })?.data?.data?.id;
            if (typeof newId === 'number') setActivePlanId(newId);
            await loadPlan();
            toast.success('План питания сгенерирован!');
          } catch {
            toast.error('Ошибка парсинга плана. Попробуйте ещё раз.');
          }
        },
        onError: (error: { message?: string; status?: number; body?: unknown }) => {
          const body = error.body as { detail?: { error?: string } } | undefined;
          const errorCode = body?.detail?.error;
          if (errorCode === 'subscription_expired') { handleSubscriptionError('subscription_expired'); return; }
          if (errorCode === 'trial_expired') { handleSubscriptionError('trial_expired'); return; }
          if (errorCode === 'daily_limit_exceeded' || error.status === 429) { handleSubscriptionError('limit'); return; }
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
        const updatedPlan = plan.map((day, di) => {
          if (di !== dayIndex) return day;
          return {
            ...day,
            meals: day.meals.map((m, mi) =>
              mi === mealIndex ? { ...m, image_url: imageUrl } : m,
            ),
          };
        });
        setPlan(updatedPlan);
        await persistPlan(updatedPlan);
        toast.success('Изображение сгенерировано!');
      }
    } catch {
      toast.error('Не удалось сгенерировать изображение');
    } finally {
      setGeneratingImage(null);
    }
  };

  const regenerateMeal = async (dayIndex: number, mealIndex: number) => {
    if (!plan) return;
    const meal = plan[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    const key = `${dayIndex}-${mealIndex}`;
    setRegeneratingMeal(key);
    try {
      const profileRes = await client.entities.user_profiles.query({ limit: 1 });
      const p = (profileRes?.data?.items ?? profileRes?.data)?.[0];
      if (!p) { toast.error('Сначала заполните профиль'); return; }

      // Calculate per-meal calorie/macro targets
      const tc = p.target_calories || 2000;
      const tp = p.target_protein || 100;
      const tf = p.target_fat || 70;
      const tcarbs = p.target_carbs || 250;

      const dist = MEAL_DISTRIBUTION[meal.type] || { min: 0.25, max: 0.30 };
      const mealCalMin = Math.round(tc * dist.min);
      const mealCalMax = Math.round(tc * dist.max);
      const mealProteinMin = Math.round(tp * dist.min);
      const mealProteinMax = Math.round(tp * dist.max);
      const mealFatMin = Math.round(tf * dist.min);
      const mealFatMax = Math.round(tf * dist.max);
      const mealCarbsMin = Math.round(tcarbs * dist.min);
      const mealCarbsMax = Math.round(tcarbs * dist.max);

      // Context: other meals in this day
      const dayMeals = plan[dayIndex].meals;
      const otherMeals = dayMeals
        .filter((_, mi) => mi !== mealIndex)
        .map(m => `${MEAL_LABELS[m.type] || m.type}: ${m.name} (${m.calories} ккал, Б${m.protein} Ж${m.fat} У${m.carbs})`)
        .join('\n');
      const otherCalories = dayMeals
        .filter((_, mi) => mi !== mealIndex)
        .reduce((sum, m) => sum + (m.calories || 0), 0);
      const remainingCalories = tc - otherCalories;

      let responseText = '';
      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'Ты — профессиональный нутрициолог. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.' },
          {
            role: 'user',
            content: `Предложи одно альтернативное блюдо для типа "${MEAL_LABELS[meal.type] || meal.type}".

Параметры пользователя:
- Цель: ${p.goal === 'lose' ? 'похудение' : p.goal === 'gain' ? 'набор массы' : 'поддержание веса'}
- Суточная норма: ${tc} ккал/день
- Целевые макросы за день: белки ~${tp}г, жиры ~${tf}г, углеводы ~${tcarbs}г
- Аллергии: ${p.allergies || 'нет'}
- Кухня: ${p.cuisine_preferences || 'Русская'}
- Время готовки: до ${p.cooking_time_minutes || 30} минут

Другие приёмы пищи в этот день:
${otherMeals || 'нет данных'}

Сумма калорий других приёмов: ${otherCalories} ккал.
На "${MEAL_LABELS[meal.type] || meal.type}" остаётся примерно ${remainingCalories} ккал.

Рекомендуемый диапазон для "${MEAL_LABELS[meal.type] || meal.type}":
- Калории: ${mealCalMin}–${mealCalMax} ккал
- Белки: ${mealProteinMin}–${mealProteinMax}г
- Жиры: ${mealFatMin}–${mealFatMax}г
- Углеводы: ${mealCarbsMin}–${mealCarbsMax}г

Подбери значения так, чтобы общая сумма за день была близка к ${tc} ккал (±100).
Верни ТОЛЬКО JSON: {"type":"${meal.type}","name":"...","calories":...,"protein":...,"fat":...,"carbs":...,"cooking_time":...}`,
          },
        ],
        model: 'openai/gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => { responseText += chunk.content || ''; },
        onComplete: async () => {
          try {
            const jsonStr = responseText.trim().match(/\{[\s\S]*\}/)?.[0] ?? responseText;
            const newMeal: MealItem = JSON.parse(jsonStr);
            const updatedPlan = plan.map((day, di) =>
              di !== dayIndex ? day : {
                ...day,
                meals: day.meals.map((m, mi) =>
                  mi === mealIndex ? { ...newMeal, image_url: undefined, recipe: undefined } : m
                ),
              }
            );
            setPlan(updatedPlan);
            setSavedRecipes((prev) => { const s = new Set(prev); s.delete(key); return s; });
            setPlanLoggedMeals((prev) => { const n = { ...prev }; delete n[key]; return n; });
            const ok = await persistPlan(updatedPlan);
            if (ok) toast.success(`Блюдо заменено на «${newMeal.name}»`);
          } catch { toast.error('Не удалось разобрать ответ ИИ'); }
        },
        onError: (error: { message?: string; status?: number; body?: unknown }) => {
          const errorCode = (error.body as { detail?: { error?: string } })?.detail?.error;
          if (errorCode === 'subscription_expired') { handleSubscriptionError('subscription_expired'); return; }
          if (errorCode === 'trial_expired') { handleSubscriptionError('trial_expired'); return; }
          if (errorCode === 'daily_limit_exceeded' || error.status === 429) { handleSubscriptionError('limit'); return; }
          toast.error(error?.message || 'Ошибка генерации блюда');
        },
      });
    } catch { toast.error('Не удалось заменить блюдо'); }
    finally { setRegeneratingMeal(null); }
  };

  const openRecipeViewer = async (dayIndex: number, mealIndex: number) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;

    if (meal.recipe) {
      setRecipeViewerDay(dayIndex);
      setRecipeViewerMeal(mealIndex);
      setRecipeViewerOpen(true);
      return;
    }

    const key = `${dayIndex}-${mealIndex}`;
    setGeneratingForViewer(key);
    await generateRecipeForMeal(dayIndex, mealIndex);
    setGeneratingForViewer(null);

    const latestMeal = planRef.current?.[dayIndex]?.meals?.[mealIndex];
    if (!latestMeal?.recipe) return;

    setRecipeViewerDay(dayIndex);
    setRecipeViewerMeal(mealIndex);
    setRecipeViewerOpen(true);
  };

  // Генерация подробного рецепта для блюда
  const generateRecipeForMeal = async (dayIndex: number, mealIndex: number) => {
    const meal = plan?.[dayIndex]?.meals?.[mealIndex];
    if (!meal) return;
    const key = `${dayIndex}-${mealIndex}`;
    setSavingRecipe(key);
    try {
      // Генерируем рецепт через AI
      let recipeText = '';
      await client.ai.gentxt({
        messages: [
          {
            role: 'system',
            content: 'Ты — профессиональный шеф-повар. Составляй подробные рецепты на русском языке. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.'
          },
          {
            role: 'user',
            content: `Составь подробный рецепт для блюда "${meal.name}" на русском языке.
Верни ТОЛЬКО JSON без markdown.
Параметры блюда:
- Калорийность: ${meal.calories} ккал
- Белки: ${meal.protein}г, Жиры: ${meal.fat}г, Углеводы: ${meal.carbs}г
- Время приготовления: ${meal.cooking_time} минут
- Тип приёма пищи: ${MEAL_LABELS[meal.type] || meal.type}

Формат JSON:
{
  "ingredients": "список ингредиентов с точными количествами (например: 200г куриной грудки, 1 ст.л. оливкового масла)",
  "instructions": "пошаговая инструкция приготовления (каждый шаг с новой строки, начинается с номера)",
  "tips": "полезные советы по приготовлению и подаче",
  "nutritional_notes": "краткие заметки о питательной ценности и пользе блюда"
}`
          },
        ],
        model: 'openai/gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          recipeText += chunk.content || '';
        },
        onComplete: async () => {
          try {
            let jsonStr = recipeText.trim();
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            const recipe: MealRecipe = JSON.parse(jsonStr);
            
            // Обновляем план с рецептом
            let updatedPlanForPersist: DayPlan[] | null = null;
            if (plan) {
              const updatedPlan = plan.map((day, di) => {
                if (di !== dayIndex) return day;
                return {
                  ...day,
                  meals: day.meals.map((m, mi) =>
                    mi === mealIndex ? { ...m, recipe } : m,
                  ),
                };
              });
              updatedPlanForPersist = updatedPlan;
              setPlan(updatedPlan);
            }

            // Сохраняем рецепт в БД
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
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
              },
            });
            setSavedRecipes((prev) => new Set(prev).add(key));
            if (updatedPlanForPersist) await persistPlan(updatedPlanForPersist);
            toast.success(`Рецепт для «${meal.name}» создан и сохранён!`);
          } catch (parseErr) {
            console.error('Recipe parse error:', parseErr);
            toast.error('Не удалось сохранить рецепт');
          }
        },
        onError: (error: { message?: string; status?: number; body?: unknown }) => {
          const body = error.body as { detail?: { error?: string } } | undefined;
          const errorCode = body?.detail?.error;
          if (errorCode === 'subscription_expired') { handleSubscriptionError('subscription_expired'); return; }
          if (errorCode === 'trial_expired') { handleSubscriptionError('trial_expired'); return; }
          if (errorCode === 'daily_limit_exceeded' || error.status === 429) { handleSubscriptionError('limit'); return; }
          toast.error(error?.message || 'Ошибка генерации рецепта');
        },
      });
    } catch {
      toast.error('Не удалось создать рецепт');
    } finally {
      setSavingRecipe(null);
    }
  };

  planRef.current = plan;

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
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-400" /> Недельный план
          </h2>
          <Button
            onClick={() => router.push('/saved-recipes')}
            size="sm"
            variant="ghost"
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
          >
            <BookmarkCheck className="w-4 h-4 mr-1" /> Рецепты
          </Button>
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2">
          {plan && activePlanId && (
            <Button
              onClick={() => setShoppingListOpen(true)}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" />
              Покупки
            </Button>
          )}
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

        {/* Опция: учитывать продукты из "Мои продукты" */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <Checkbox
            checked={useMyProducts}
            onCheckedChange={(v) => setUseMyProducts(Boolean(v))}
            className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
          <span className="text-sm text-slate-300">
            Учитывать мои продукты при генерации
          </span>
        </label>

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
                  {DAYS_SHORT[i] ?? DAYS_RU[i]?.slice(0, 2)}
                </button>
              ))}
            </div>

            {/* Selected Day Meals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-emerald-400">
                  {plan[selectedDay]?.day || DAYS_RU[selectedDay]}
                </h3>
                {activePlanId && (
                  <Popover
                    open={copyPopoverOpen && copyTemplateDay === selectedDay}
                    onOpenChange={(open) => {
                      setCopyPopoverOpen(open);
                      if (open) { setCopyTemplateDay(selectedDay); setCopyTargetDays(new Set()); }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-all">
                        <Copy className="w-3 h-3" />
                        Повторить
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-slate-900 border-slate-700 p-4" align="end">
                      <p className="text-sm font-medium text-white mb-3">
                        Повторить меню «{DAYS_SHORT[selectedDay]}» на:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {DAYS_SHORT.map((label, i) => {
                          if (i === selectedDay) return null;
                          const checked = copyTargetDays.has(i);
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const next = new Set(copyTargetDays);
                                checked ? next.delete(i) : next.add(i);
                                setCopyTargetDays(next);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                                checked ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setCopyPopoverOpen(false); setCopyTargetDays(new Set()); }}
                          className="flex-1 py-2 rounded-xl text-sm text-slate-400 bg-slate-800 hover:bg-slate-700"
                        >
                          Отмена
                        </button>
                        <button
                          disabled={copyTargetDays.size === 0}
                          onClick={() => void handleApplyTemplate()}
                          className="flex-1 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Применить ({copyTargetDays.size})
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {(plan[selectedDay]?.meals || []).map((meal, i) => {
                const imgKey = `${selectedDay}-${i}`;
                return (
                  <div
                    key={`${meal.type}-${i}`}
                    className={`p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 transition-opacity ${planLoggedMeals[`${selectedDay}-${i}`] ? 'opacity-60' : ''}`}
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
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                          {MEAL_EMOJI[meal.type] || '🍽️'}{' '}
                          {MEAL_LABELS[meal.type] || meal.type}
                        </span>
                        {selectedDay === todayPlanDayIndex && (
                          <label className={`flex items-center gap-1.5 text-sm select-none cursor-pointer ${planLoggedMeals[`${selectedDay}-${i}`] ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <Checkbox
                              className="h-5 w-5 shrink-0 rounded-full border-emerald-500/60 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              checked={!!planLoggedMeals[`${selectedDay}-${i}`]}
                              onCheckedChange={(c) => toggleMealLogged(selectedDay, i, !!c)}
                              disabled={savingCheckbox === `${selectedDay}-${i}`}
                            />
                            {savingCheckbox === `${selectedDay}-${i}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Съедено'
                            )}
                          </label>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openMealEditor(selectedDay, i)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-sky-400 transition-colors"
                          title="Изменить блюдо"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void regenerateMeal(selectedDay, i)}
                          disabled={regeneratingMeal === imgKey || !!savingRecipe || generating}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-violet-400 transition-colors disabled:opacity-50"
                          title="Заменить блюдо"
                        >
                          {regeneratingMeal === imgKey
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void openRecipeViewer(selectedDay, i)}
                          disabled={generatingForViewer === imgKey || savingRecipe === imgKey}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-50"
                          title={meal.recipe ? 'Смотреть рецепт' : 'Получить рецепт'}
                        >
                          {generatingForViewer === imgKey
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <BookOpen className="w-3.5 h-3.5" />}
                        </button>
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
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" /> {meal.cooking_time || 20} мин
                        </div>
                      </div>
                    </div>
                    <p className={`font-medium mb-2 ${planLoggedMeals[`${selectedDay}-${i}`] ? 'line-through text-slate-500' : 'text-white'}`}>{meal.name}</p>
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

      <Dialog open={mealEditorOpen} onOpenChange={setMealEditorOpen}>
        <DialogContent className="sm:max-w-md border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Редактировать блюдо</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="meal-edit-name">Название</Label>
              <Input
                id="meal-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="meal-edit-cal">Ккал</Label>
                <Input
                  id="meal-edit-cal"
                  type="number"
                  min={0}
                  value={editCalories}
                  onChange={(e) => setEditCalories(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="meal-edit-time">Время (мин)</Label>
                <Input
                  id="meal-edit-time"
                  type="number"
                  min={0}
                  value={editCookingTime}
                  onChange={(e) => setEditCookingTime(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="meal-edit-p">Белки (г)</Label>
                <Input
                  id="meal-edit-p"
                  type="number"
                  min={0}
                  step="0.1"
                  value={editProtein}
                  onChange={(e) => setEditProtein(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="meal-edit-f">Жиры (г)</Label>
                <Input
                  id="meal-edit-f"
                  type="number"
                  min={0}
                  step="0.1"
                  value={editFat}
                  onChange={(e) => setEditFat(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="meal-edit-c">Углеводы (г)</Label>
                <Input
                  id="meal-edit-c"
                  type="number"
                  min={0}
                  step="0.1"
                  value={editCarbs}
                  onChange={(e) => setEditCarbs(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-slate-600"
              onClick={() => setMealEditorOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void saveEditedMeal()}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(() => {
        const vm = plan?.[recipeViewerDay]?.meals?.[recipeViewerMeal];
        const ingredients = vm?.recipe?.ingredients?.split('\n').filter(Boolean) ?? [];
        const instructions = vm?.recipe?.instructions?.split('\n').filter(Boolean) ?? [];
        return (
          <Sheet open={recipeViewerOpen} onOpenChange={setRecipeViewerOpen}>
            <SheetContent side="right" className="w-full sm:max-w-lg bg-slate-950 border-slate-800 text-slate-100 p-0 flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{MEAL_EMOJI[vm?.type ?? ''] || '🍽️'}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">{MEAL_LABELS[vm?.type ?? ''] || vm?.type}</span>
                </div>
                <SheetTitle className="text-white text-xl leading-tight">{vm?.name}</SheetTitle>
                <div className="flex items-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1 text-orange-400"><Flame className="w-3 h-3" />{vm?.calories} ккал</span>
                  <span className="text-red-400">Б {vm?.protein}г</span>
                  <span className="text-amber-400">Ж {vm?.fat}г</span>
                  <span className="text-blue-400">У {vm?.carbs}г</span>
                  <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" />{vm?.cooking_time} мин</span>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-5">
                  {ingredients.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wide">Ингредиенты</h3>
                      <ul className="space-y-1.5">
                        {ingredients.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {instructions.length > 0 && (
                    <>
                      <Separator className="bg-slate-800" />
                      <section>
                        <h3 className="text-sm font-semibold text-sky-400 mb-2 uppercase tracking-wide">Приготовление</h3>
                        <ol className="space-y-3">
                          {instructions.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center font-medium">{idx + 1}</span>
                              {step.replace(/^\d+\.\s*/, '')}
                            </li>
                          ))}
                        </ol>
                      </section>
                    </>
                  )}
                  {vm?.recipe?.tips && (
                    <>
                      <Separator className="bg-slate-800" />
                      <section>
                        <h3 className="text-sm font-semibold text-amber-400 mb-2 uppercase tracking-wide">Советы</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{vm.recipe.tips}</p>
                      </section>
                    </>
                  )}
                  {vm?.recipe?.nutritional_notes && (
                    <>
                      <Separator className="bg-slate-800" />
                      <section>
                        <h3 className="text-sm font-semibold text-violet-400 mb-2 uppercase tracking-wide">Польза блюда</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{vm.recipe.nutritional_notes}</p>
                      </section>
                    </>
                  )}
                  <div className="h-4" />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        );
      })()}

      <UpgradeSubscriptionModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        trigger={limitTrigger}
      />

      {/* Shopping List Sheet */}
      <Sheet open={shoppingListOpen} onOpenChange={setShoppingListOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 border-slate-800 flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Список покупок
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">Выберите дни:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShoppingDays(shoppingDays.size === 7 ? new Set() : new Set([0,1,2,3,4,5,6]));
                  setShoppingList(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${shoppingDays.size === 7 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Вся неделя
              </button>
              {DAYS_SHORT.map((label, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = new Set(shoppingDays);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setShoppingDays(next);
                    setShoppingList(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${shoppingDays.has(i) ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => void generateShoppingList()}
              disabled={generatingShoppingList || shoppingDays.size === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-40"
            >
              {generatingShoppingList
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Составляем список...</>
                : `✨ Составить список${shoppingDays.size > 0 && shoppingDays.size < 7 ? ` (${shoppingDays.size} дн.)` : ''}`}
            </Button>
          </div>

          <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
            {shoppingList && (
              <div className="space-y-4 pb-6">
                {checkedItems.size > 0 && (
                  <p className="text-xs text-slate-400 text-center">
                    ✓ {checkedItems.size} из {shoppingList.reduce((s, c) => s + c.items.length, 0)} позиций
                  </p>
                )}
                {shoppingList.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {cat.category}
                    </p>
                    <div className="space-y-1.5">
                      {cat.items.map((item) => {
                        const key = `${cat.category}:${item.name}`;
                        const checked = checkedItems.has(key);
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              const next = new Set(checkedItems);
                              checked ? next.delete(key) : next.add(key);
                              setCheckedItems(next);
                            }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${checked ? 'opacity-50 bg-slate-800/30' : 'bg-slate-900/50 hover:bg-slate-800/50'}`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'bg-emerald-500 border-emerald-500' : item.have ? 'border-emerald-600' : 'border-slate-600'}`}>
                              {checked && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            <span className={`flex-1 text-sm ${checked ? 'line-through text-slate-500' : 'text-white'}`}>
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-400 flex-shrink-0">{item.amount}</span>
                            {item.have && !checked && (
                              <span className="text-[10px] text-emerald-500 flex-shrink-0">есть</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}