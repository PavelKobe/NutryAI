import { client } from '@/lib/api';
import { localDateKeyFromLoggedAt, localTodayKey } from '@/lib/date_local';

/** Единый ключ и fetcher: иначе prefetch (BottomNav) и MicronutrientPanel клали в кэш разные структуры → пустой блок до hard refresh */
export const mealLogsTodayQueryKey = ['meal_logs_today'] as const;

export async function fetchMealLogsToday() {
  const res = await client.entities.meal_logs.query({ sort: '-created_at', limit: 100 });
  const raw = (res?.data as { items?: unknown })?.items ?? (res?.data as unknown) ?? [];
  const allLogs = Array.isArray(raw) ? raw : [];
  const today = localTodayKey();
  return allLogs.filter((log) => {
    const loggedAt = (log as { logged_at?: string }).logged_at;
    return localDateKeyFromLoggedAt(loggedAt) === today;
  });
}
