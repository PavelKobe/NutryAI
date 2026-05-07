'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { localDateKeyFromLoggedAt, localTodayKey } from '@/lib/date_local';
import { mealLogsTodayQueryKey } from '@/lib/queries/meal_logs_today';
import AppLayout from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import WaterTracker from '@/components/WaterTracker';
import MicronutrientPanel from '@/components/MicronutrientPanel';
import {
  Flame,
  Beef,
  Droplets,
  Wheat,
  Plus,
  Sparkles,
  CalendarDays,
  Camera,
  Trash2,
  Loader2,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import ShareStatsModal from '@/components/share/ShareStatsModal';
import CoachingCard from '@/components/coaching/CoachingCard';

interface UserProfile {
  target_calories: number;
  target_protein: number;
  target_fat: number;
  target_carbs: number;
  goal: string;
}

interface MealLogItem {
  id: number;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged_at: string;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 Завтрак',
  lunch: '☀️ Обед',
  dinner: '🌙 Ужин',
  snack: '🍎 Перекус',
};

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLogs, setTodayLogs] = useState<MealLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      // Load profile
      const profileRes = await client.entities.user_profiles.query({ limit: 1 });
      const rawProfiles = profileRes?.data?.items ?? profileRes?.data ?? [];
      const profiles = Array.isArray(rawProfiles) ? rawProfiles : [];
      if (profiles.length === 0) {
        router.push('/onboarding');
        return;
      }
      setProfile(profiles[0]);

      // Load today's meal logs (локальный календарный день, не UTC)
      const today = localTodayKey();
      const logsRes = await client.entities.meal_logs.query({
        sort: '-created_at',
        limit: 50,
      });
      const rawLogs = logsRes?.data?.items ?? logsRes?.data ?? [];
      const allLogs: MealLogItem[] = Array.isArray(rawLogs) ? rawLogs : [];
      const filtered = allLogs.filter((l) => {
        const logDate = localDateKeyFromLoggedAt(l.logged_at);
        return logDate === today;
      });
      setTodayLogs(filtered);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoadError(
        err instanceof Error ? err.message : 'Не удалось загрузить данные. Проверьте сеть и авторизацию.'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      fat: acc.fat + (log.fat || 0),
      carbs: acc.carbs + (log.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const getPercent = (current: number, target: number) =>
    target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  const deleteLog = async (id: number) => {
    setDeletingId(id);
    try {
      await client.entities.meal_logs.delete({ id: String(id) });
      setTodayLogs((prev) => prev.filter((l) => l.id !== id));
      await queryClient.invalidateQueries({ queryKey: [...mealLogsTodayQueryKey] });
      void queryClient.refetchQueries({ queryKey: [...mealLogsTodayQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['meal_logs_analytics'] });
    } catch {
      toast.error('Не удалось удалить запись');
    } finally {
      setDeletingId(null);
    }
  };

  const generateInsight = async () => {
    if (!profile) return;
    setInsightLoading(true);
    try {
      const prompt = `Ты — ИИ-нутрициолог NutriAI. Дай короткий (2-3 предложения) персональный совет на русском языке.
Цель пользователя: ${profile.goal === 'lose' ? 'похудение' : profile.goal === 'gain' ? 'набор массы' : 'поддержание веса'}.
Целевые КБЖУ: ${profile.target_calories} ккал, Б${profile.target_protein}г, Ж${profile.target_fat}г, У${profile.target_carbs}г.
Сегодня съедено: ${Math.round(totals.calories)} ккал, Б${Math.round(totals.protein)}г, Ж${Math.round(totals.fat)}г, У${Math.round(totals.carbs)}г.
Приёмов пищи: ${todayLogs.length}.
Дай мотивирующий совет на основе этих данных.`;

      let result = '';
      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'Ты — дружелюбный ИИ-нутрициолог. Отвечай кратко и по делу на русском языке.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          result += chunk.content || '';
          setAiInsight(result);
        },
        onComplete: () => {},
        onError: (error: { message?: string }) => {
          toast.error(error?.message || 'Ошибка ИИ');
        },
      });
    } catch {
      toast.error('Не удалось получить совет ИИ');
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Дашборд">
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (!profile) {
    if (loadError) {
      return (
        <AppLayout title="Дашборд">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-4">
            <p className="text-rose-200 text-sm">{loadError}</p>
            <Button variant="outline" onClick={() => { setLoading(true); loadData(); }}>
              Повторить
            </Button>
          </div>
        </AppLayout>
      );
    }
    return (
      <AppLayout title="Дашборд">
        <DashboardSkeleton />
        <p className="mt-4 text-center text-sm text-slate-400">Перенаправление…</p>
      </AppLayout>
    );
  }

  const calPercent = getPercent(totals.calories, profile.target_calories);

  return (
    <AppLayout title="Дашборд">
      <div className="space-y-5">
        {/* Calorie Ring */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" /> Калории сегодня
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={calPercent > 100 ? '#ef4444' : '#10b981'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${calPercent * 2.64} 264`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{Math.round(totals.calories)}</span>
                <span className="text-xs text-slate-400">из {profile.target_calories}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: 'Белки', current: totals.protein, target: profile.target_protein, icon: Beef, color: 'bg-red-500', unit: 'г' },
                { label: 'Жиры', current: totals.fat, target: profile.target_fat, icon: Droplets, color: 'bg-amber-500', unit: 'г' },
                { label: 'Углеводы', current: totals.carbs, target: profile.target_carbs, icon: Wheat, color: 'bg-blue-500', unit: 'г' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <m.icon className="w-3 h-3" /> {m.label}
                    </span>
                    <span className="text-slate-300">
                      {Math.round(m.current)}/{m.target}{m.unit}
                    </span>
                  </div>
                  <Progress
                    value={getPercent(m.current, m.target)}
                    className="h-2 bg-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Water Tracker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <WaterTracker />
          <MicronutrientPanel />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => router.push('/add-food')}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl"
            variant="ghost"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs font-medium">Фото еды</span>
          </Button>
          <Button
            onClick={() => router.push('/meal-plan')}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-2xl"
            variant="ghost"
          >
            <CalendarDays className="w-6 h-6" />
            <span className="text-xs font-medium">План</span>
          </Button>
          <Button
            onClick={() => router.push('/add-food')}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-2xl"
            variant="ghost"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">Вручную</span>
          </Button>
        </div>

        {/* Coaching */}
        <CoachingCard />

        {/* AI Insight */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-4 h-4" /> Совет ИИ
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={generateInsight}
              disabled={insightLoading}
              className="text-indigo-400 hover:text-indigo-300 text-xs"
            >
              {insightLoading ? 'Думаю...' : 'Обновить'}
            </Button>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {aiInsight || 'Нажмите «Обновить», чтобы получить персональный совет от ИИ-нутрициолога'}
          </p>
        </div>

        {/* Today's Meals */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Приёмы пищи сегодня</h3>
          {todayLogs.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
              <p className="text-slate-400 mb-3">Вы ещё ничего не добавили сегодня</p>
              <Button
                onClick={() => router.push('/add-food')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Добавить еду
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">
                      {MEAL_TYPE_LABELS[log.meal_type] || log.meal_type}
                    </span>
                    <p className="font-medium text-sm truncate">{log.food_name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">{Math.round(log.calories)} ккал</p>
                      <p className="text-xs text-slate-500">
                        Б{Math.round(log.protein)} Ж{Math.round(log.fat)} У{Math.round(log.carbs)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteLog(log.id)}
                      disabled={deletingId === log.id}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Удалить запись"
                    >
                      {deletingId === log.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ShareStatsModal open={shareOpen} onOpenChange={setShareOpen} mode="daily" />
    </AppLayout>
  );
}