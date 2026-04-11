import { localDateKey, localDateKeyFromLoggedAt, localTodayKey } from './date_local';

interface MealLogEntry {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged_at: string;
}

interface WeightLogEntry {
  weight_kg: number;
  logged_at: string;
}

/**
 * Считает streak — кол-во дней подряд с хотя бы одной записью.
 * Если сегодня нет логов, начинаем со вчера.
 */
export function calcStreak(logs: MealLogEntry[]): number {
  if (logs.length === 0) return 0;

  const daysWithLogs = new Set<string>();
  for (const log of logs) {
    const key = localDateKeyFromLoggedAt(log.logged_at);
    if (key) daysWithLogs.add(key);
  }

  const today = new Date();
  const todayKey = localTodayKey();

  // Начинаем с сегодня, если есть логи, иначе со вчера
  let current = new Date(today);
  if (!daysWithLogs.has(todayKey)) {
    current.setDate(current.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = localDateKey(current);
    if (!daysWithLogs.has(key)) break;
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Средние показатели за последние 7 дней.
 */
export function calcWeeklyAverages(logs: MealLogEntry[]): {
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  daysWithData: number;
} {
  const today = new Date();
  const dayTotals: Record<string, { calories: number; protein: number; fat: number; carbs: number }> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayTotals[localDateKey(d)] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  }

  for (const log of logs) {
    const key = localDateKeyFromLoggedAt(log.logged_at);
    if (key && key in dayTotals) {
      dayTotals[key].calories += log.calories || 0;
      dayTotals[key].protein += log.protein || 0;
      dayTotals[key].fat += log.fat || 0;
      dayTotals[key].carbs += log.carbs || 0;
    }
  }

  const daysWithData = Object.values(dayTotals).filter((d) => d.calories > 0).length;
  if (daysWithData === 0) {
    return { avgCalories: 0, avgProtein: 0, avgFat: 0, avgCarbs: 0, daysWithData: 0 };
  }

  const totals = Object.values(dayTotals).reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      fat: acc.fat + d.fat,
      carbs: acc.carbs + d.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return {
    avgCalories: Math.round(totals.calories / daysWithData),
    avgProtein: Math.round(totals.protein / daysWithData),
    avgFat: Math.round(totals.fat / daysWithData),
    avgCarbs: Math.round(totals.carbs / daysWithData),
    daysWithData,
  };
}

/**
 * Изменение веса за последние 7 дней.
 */
export function calcWeightChange(
  logs: WeightLogEntry[]
): { startWeight: number; endWeight: number; change: number } | null {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recent = logs
    .filter((l) => {
      const key = localDateKeyFromLoggedAt(l.logged_at);
      if (!key) return false;
      const d = new Date(key);
      return d >= weekAgo;
    })
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

  if (recent.length < 2) return null;

  const startWeight = recent[0].weight_kg;
  const endWeight = recent[recent.length - 1].weight_kg;
  return {
    startWeight,
    endWeight,
    change: Math.round((endWeight - startWeight) * 10) / 10,
  };
}
