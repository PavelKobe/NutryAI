'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminActivateCoaching,
  adminExtendCoaching,
  adminFetchCoachingMessages,
  adminGetCoachingClient,
  adminGetCoachingClientMealLogs,
  adminGetCoachingClientMealPlan,
  adminGetCoachingClientProfile,
  adminSendCoachingMessage,
  type AdminCoachingClientProfile,
  type AdminCoachingMealLog,
  type AdminCoachingMessage,
} from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { localDateKey, localDateKeyFromLoggedAt, localTodayKey } from '@/lib/date_local';
import EnableNotificationsButton from '@/components/coaching/EnableNotificationsButton';
import {
  coachingUnreadKey,
  markCoachingRead,
  setBadgeCount,
} from '@/lib/push';

const POLL_INTERVAL_MS = 12_000;

// ─── Mappings ────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  lose: '🔥 Похудеть',
  maintain: '⚖️ Поддержать вес',
  gain: '💪 Набрать массу',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Сидячий образ жизни',
  light: 'Лёгкая активность (1–3 раза/нед)',
  moderate: 'Умеренная (3–5 раз/нед)',
  high: 'Высокая (6–7 раз/нед)',
  very_high: 'Очень высокая (спорт ежедневно)',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'М',
  female: 'Ж',
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 Завтрак',
  lunch: '☀️ Обед',
  dinner: '🌙 Ужин',
  snack: '🍎 Перекус',
};

const DAYS_RU = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── Types for plan_data ─────────────────────────────────────────────────────

interface PlanMealRecipe {
  ingredients?: string;
  instructions?: string;
  tips?: string;
  nutritional_notes?: string;
}

interface PlanMeal {
  type: string;
  name: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  cooking_time?: number;
  image_url?: string;
  recipe?: PlanMealRecipe;
}

interface PlanDay {
  day: string;
  meals: PlanMeal[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeParsePlan(raw: string | null | undefined): PlanDay[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PlanDay[];
    return null;
  } catch {
    return null;
  }
}

// Группирует логи по дате (локальный YYYY-MM-DD)
function groupLogsByDay(
  logs: AdminCoachingMealLog[]
): Array<{ key: string; label: string; logs: AdminCoachingMealLog[] }> {
  const buckets = new Map<string, AdminCoachingMealLog[]>();
  for (const log of logs) {
    const key = log.logged_at
      ? localDateKeyFromLoggedAt(log.logged_at) ?? 'unknown'
      : 'unknown';
    const arr = buckets.get(key) ?? [];
    arr.push(log);
    buckets.set(key, arr);
  }
  const todayKey = localTodayKey();
  const yesterdayKey = localDateKey(new Date(Date.now() - 86_400_000));
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, dayLogs]) => {
      let label: string;
      if (key === 'unknown') label = 'Без даты';
      else if (key === todayKey) label = 'Сегодня';
      else if (key === yesterdayKey) label = 'Вчера';
      else
        label = new Date(key).toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        });
      return { key, label, logs: dayLogs };
    });
}

function sumMacros(logs: AdminCoachingMealLog[]): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
} {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      protein: acc.protein + (l.protein ?? 0),
      fat: acc.fat + (l.fat ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminCoachingClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const userId = params?.id;

  const [messages, setMessages] = useState<AdminCoachingMessage[]>([]);
  const [input, setInput] = useState('');
  const lastIdRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['admin-coaching-client', userId],
    queryFn: () => adminGetCoachingClient(userId!),
    enabled: !!userId,
  });

  const { data: profile } = useQuery({
    queryKey: ['admin-coaching-client-profile', userId],
    queryFn: () => adminGetCoachingClientProfile(userId!),
    enabled: !!userId,
  });

  const { data: mealLogs } = useQuery({
    queryKey: ['admin-coaching-client-meal-logs', userId],
    queryFn: () => adminGetCoachingClientMealLogs(userId!, { limit: 100 }),
    enabled: !!userId,
  });

  const { data: mealPlan } = useQuery({
    queryKey: ['admin-coaching-client-meal-plan', userId],
    queryFn: () => adminGetCoachingClientMealPlan(userId!),
    enabled: !!userId,
  });

  // Initial messages load + polling
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    adminFetchCoachingMessages(userId, 0)
      .then(async (page) => {
        if (cancelled) return;
        setMessages(page.items);
        lastIdRef.current = page.last_id;
        // mark all client-sent messages from this client as read
        try {
          await markCoachingRead({ clientId: userId });
          await setBadgeCount(0);
          qc.invalidateQueries({ queryKey: coachingUnreadKey });
          qc.invalidateQueries({ queryKey: ['admin-coaching-clients'] });
        } catch (err) {
          console.warn('admin mark-read failed:', err);
        }
      })
      .catch((err) => console.error('Failed to load messages:', err));

    const id = setInterval(async () => {
      try {
        const page = await adminFetchCoachingMessages(userId, lastIdRef.current);
        if (page.items.length > 0) {
          setMessages((prev) => [...prev, ...page.items]);
          lastIdRef.current = page.last_id;
          if (
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
          ) {
            try {
              await markCoachingRead({ clientId: userId });
              await setBadgeCount(0);
              qc.invalidateQueries({ queryKey: coachingUnreadKey });
              qc.invalidateQueries({ queryKey: ['admin-coaching-clients'] });
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId, qc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: (content: string) => adminSendCoachingMessage(userId!, content),
    onSuccess: (msg) => {
      setMessages((prev) => [...prev, msg]);
      lastIdRef.current = msg.id;
      setInput('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMut = useMutation({
    mutationFn: () => adminActivateCoaching(userId!),
    onSuccess: () => {
      toast.success('Сопровождение активировано');
      void qc.invalidateQueries({ queryKey: ['admin-coaching-client', userId] });
      void qc.invalidateQueries({ queryKey: ['admin-coaching-clients'] });
      void qc.invalidateQueries({ queryKey: ['admin-coaching-all-users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extendMut = useMutation({
    mutationFn: (days: number) => adminExtendCoaching(userId!, days),
    onSuccess: () => {
      toast.success('Подписка продлена');
      void qc.invalidateQueries({ queryKey: ['admin-coaching-client', userId] });
      void qc.invalidateQueries({ queryKey: ['admin-coaching-clients'] });
      void qc.invalidateQueries({ queryKey: ['admin-coaching-all-users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  const groupedLogs = useMemo(
    () => groupLogsByDay(mealLogs?.items ?? []),
    [mealLogs]
  );
  const planDays = useMemo(
    () => safeParsePlan(mealPlan?.plan_data),
    [mealPlan]
  );

  if (clientLoading) {
    return <p className="text-slate-400">Загрузка…</p>;
  }

  const isActive = client?.status === 'active';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push('/admin/coaching')}>
          ← Назад
        </Button>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              {client?.user_email}
            </h1>
            <p className="text-sm text-slate-400">
              {client?.user_name ?? 'Без имени'}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'активен' : 'истёк'}
              </Badge>
              <span className="text-sm text-slate-300">
                до {formatDate(client?.expires_at)} ({client?.days_left} дн.)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <EnableNotificationsButton />
            <Button
              variant="outline"
              className="border-slate-700"
              disabled={extendMut.isPending}
              onClick={() => extendMut.mutate(30)}
            >
              Продлить +30 дн.
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={activateMut.isPending}
              onClick={() => activateMut.mutate()}
            >
              {isActive ? 'Активировать' : 'Активировать без оплаты'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: data */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-slate-800/60 border-b border-slate-800 w-full justify-start rounded-none">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="diary">Дневник</TabsTrigger>
              <TabsTrigger value="plan">План питания</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="p-4">
              <ProfileSection profile={profile} />
            </TabsContent>

            <TabsContent value="diary" className="p-4">
              <DiarySection groupedLogs={groupedLogs} />
            </TabsContent>

            <TabsContent value="plan" className="p-4">
              <PlanSection
                planDays={planDays}
                rawPlan={mealPlan?.plan_data ?? null}
                createdAt={mealPlan?.created_at}
                weekStart={mealPlan?.week_start}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: chat */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">Личный чат</h2>
            <p className="text-xs text-slate-400">
              {isActive
                ? 'Подписка активна — можно отвечать клиенту'
                : 'Подписка истекла — отправка заблокирована'}
            </p>
          </div>

          <div className="flex-1 p-3 space-y-2 max-h-[480px] overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">
                Сообщений ещё нет
              </p>
            )}
            {messages.map((m) => {
              const isClientMsg = m.sender_role === 'client';
              return (
                <div
                  key={m.id}
                  className={`flex ${isClientMsg ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                      isClientMsg
                        ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                        : 'bg-emerald-600 text-white rounded-br-md'
                    }`}
                  >
                    <div>{m.content}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        isClientMsg ? 'text-slate-500' : 'text-emerald-100/80'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-800 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                isActive ? 'Ответить клиенту...' : 'Сначала активируйте подписку'
              }
              disabled={!isActive || sendMut.isPending}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !isActive || sendMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile section ─────────────────────────────────────────────────────────

function ProfileSection({
  profile,
}: {
  profile: AdminCoachingClientProfile | undefined;
}) {
  const p = profile;
  if (!p) {
    return <p className="text-slate-400 text-sm">Профиль не заполнен</p>;
  }

  const allergies = parseList(p.allergies);
  const cuisines = parseList(p.cuisine_preferences);
  const goalLabel = p.goal
    ? GOAL_LABELS[p.goal] ?? p.goal
    : '—';
  const activityLabel = p.activity_level
    ? ACTIVITY_LABELS[p.activity_level] ?? p.activity_level
    : '—';

  return (
    <div className="space-y-4">
      {/* Anthropometry */}
      <Section title="Антропометрия">
        <div className="grid grid-cols-2 gap-2">
          <KV
            label="Пол"
            value={p.gender ? GENDER_LABELS[p.gender] ?? p.gender : '—'}
          />
          <KV label="Возраст" value={p.age ? `${p.age} лет` : '—'} />
          <KV label="Рост" value={p.height_cm ? `${p.height_cm} см` : '—'} />
          <KV
            label="Вес"
            value={p.weight_kg ? `${p.weight_kg} кг` : '—'}
          />
          <KV
            label="Желаемый вес"
            value={p.target_weight_kg ? `${p.target_weight_kg} кг` : '—'}
          />
          <KV label="Активность" value={activityLabel} />
        </div>
      </Section>

      {/* Goal */}
      <Section title="Цель">
        <div className="text-base text-slate-200">{goalLabel}</div>
      </Section>

      {/* Macros target */}
      <Section title="Дневные нормы">
        <div className="grid grid-cols-4 gap-2">
          <Stat
            label="Калории"
            value={p.target_calories ? Math.round(p.target_calories) : '—'}
            unit="ккал"
            color="emerald"
          />
          <Stat
            label="Белки"
            value={p.target_protein ? Math.round(p.target_protein) : '—'}
            unit="г"
            color="rose"
          />
          <Stat
            label="Жиры"
            value={p.target_fat ? Math.round(p.target_fat) : '—'}
            unit="г"
            color="amber"
          />
          <Stat
            label="Углеводы"
            value={p.target_carbs ? Math.round(p.target_carbs) : '—'}
            unit="г"
            color="indigo"
          />
        </div>
      </Section>

      {/* Allergies */}
      <Section title="Аллергии и ограничения">
        {allergies.length === 0 ? (
          <p className="text-slate-500 text-sm">Нет</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((a) => (
              <span
                key={a}
                className="px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 text-xs border border-rose-500/30"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Cuisine */}
      <Section title="Предпочтения кухонь">
        {cuisines.length === 0 ? (
          <p className="text-slate-500 text-sm">Не указаны</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cuisines.map((c) => (
              <span
                key={c}
                className="px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs border border-indigo-500/30"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Misc */}
      {(p.budget_per_week || p.cooking_time_minutes) && (
        <Section title="Прочее">
          <div className="grid grid-cols-2 gap-2">
            {p.budget_per_week ? (
              <KV
                label="Бюджет / нед"
                value={`${p.budget_per_week.toLocaleString('ru-RU')} ₽`}
              />
            ) : null}
            {p.cooking_time_minutes ? (
              <KV
                label="Время готовки"
                value={`до ${p.cooking_time_minutes} мин`}
              />
            ) : null}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-slate-200 text-sm mt-0.5">{value}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | string;
  unit: string;
  color: 'emerald' | 'rose' | 'amber' | 'indigo';
}) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  } as const;
  return (
    <div
      className={`p-2.5 rounded-lg border ${colorMap[color]} flex flex-col items-center text-center`}
    >
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[10px] mt-0.5 opacity-80">{unit}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">
        {label}
      </div>
    </div>
  );
}

// ─── Diary section ───────────────────────────────────────────────────────────

function DiarySection({
  groupedLogs,
}: {
  groupedLogs: Array<{ key: string; label: string; logs: AdminCoachingMealLog[] }>;
}) {
  if (groupedLogs.length === 0) {
    return <p className="text-slate-400 text-sm">Записей в дневнике нет</p>;
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {groupedLogs.map((group) => {
        const totals = sumMacros(group.logs);
        return (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between sticky top-0 bg-slate-900 py-1">
              <h4 className="text-sm font-semibold text-slate-100 capitalize">
                {group.label}
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">
                  {Math.round(totals.calories)} ккал
                </span>
                <span className="text-slate-500">
                  Б {Math.round(totals.protein)} / Ж {Math.round(totals.fat)} / У{' '}
                  {Math.round(totals.carbs)} г
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {group.logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-start gap-3"
                >
                  {log.photo_url && (
                    <img
                      src={log.photo_url}
                      alt={log.food_name ?? 'meal'}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0 border border-slate-700"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-slate-100 text-sm font-medium truncate">
                          {log.food_name ?? '—'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {log.meal_type
                            ? MEAL_TYPE_LABELS[log.meal_type] ?? log.meal_type
                            : ''}{' '}
                          ·{' '}
                          {log.logged_at
                            ? new Date(log.logged_at).toLocaleTimeString(
                                'ru-RU',
                                { hour: '2-digit', minute: '2-digit' }
                              )
                            : '—'}
                          {log.portion_grams ? ` · ${log.portion_grams} г` : ''}
                        </p>
                      </div>
                      <span className="text-emerald-400 text-sm font-semibold whitespace-nowrap">
                        {log.calories ? Math.round(log.calories) : '—'} ккал
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                      <span>Б {log.protein ? Math.round(log.protein) : '—'} г</span>
                      <span>Ж {log.fat ? Math.round(log.fat) : '—'} г</span>
                      <span>У {log.carbs ? Math.round(log.carbs) : '—'} г</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Plan section ────────────────────────────────────────────────────────────

function PlanSection({
  planDays,
  rawPlan,
  createdAt,
  weekStart,
}: {
  planDays: PlanDay[] | null;
  rawPlan: string | null;
  createdAt?: string | null;
  weekStart?: string | null;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  if (!rawPlan) {
    return <p className="text-slate-400 text-sm">План питания не задан</p>;
  }

  if (!planDays || planDays.length === 0) {
    // Не получилось распарсить как массив дней — fallback к JSON
    return (
      <div>
        <p className="text-amber-400 text-xs mb-2">
          Формат плана нестандартный — показан как текст
        </p>
        <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 max-h-[480px] overflow-auto whitespace-pre-wrap">
          {(() => {
            try {
              return JSON.stringify(JSON.parse(rawPlan), null, 2);
            } catch {
              return rawPlan;
            }
          })()}
        </pre>
      </div>
    );
  }

  const safeDay = Math.min(activeDay, planDays.length - 1);
  const currentDay = planDays[safeDay];
  const dayTotals = currentDay.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + (m.protein ?? 0),
      fat: acc.fat + (m.fat ?? 0),
      carbs: acc.carbs + (m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Создан {formatDateTime(createdAt)}
        {weekStart ? ` · неделя ${weekStart}` : ''}
      </p>

      {/* Day pills */}
      <div className="flex flex-wrap gap-1.5">
        {planDays.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDay(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              idx === safeDay
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={day.day || DAYS_RU[idx]}
          >
            {DAYS_SHORT[idx] ?? day.day}
          </button>
        ))}
      </div>

      {/* Day totals */}
      <div className="rounded-xl bg-slate-800/40 border border-slate-800 p-3">
        <h4 className="text-sm font-semibold text-slate-100 mb-2">
          {currentDay.day || DAYS_RU[safeDay]}
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <Stat
            label="Калории"
            value={Math.round(dayTotals.calories)}
            unit="ккал"
            color="emerald"
          />
          <Stat
            label="Белки"
            value={Math.round(dayTotals.protein)}
            unit="г"
            color="rose"
          />
          <Stat
            label="Жиры"
            value={Math.round(dayTotals.fat)}
            unit="г"
            color="amber"
          />
          <Stat
            label="Углеводы"
            value={Math.round(dayTotals.carbs)}
            unit="г"
            color="indigo"
          />
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {currentDay.meals.length === 0 && (
          <p className="text-slate-500 text-sm">Нет приёмов пищи</p>
        )}
        {currentDay.meals.map((meal, mIdx) => {
          const recipeKey = `${safeDay}-${mIdx}`;
          const isExpanded = expandedRecipe === recipeKey;
          const hasRecipe = meal.recipe && Object.keys(meal.recipe).length > 0;
          return (
            <div
              key={recipeKey}
              className="rounded-xl bg-slate-800/40 border border-slate-800 overflow-hidden"
            >
              <div className="p-3 flex items-start gap-3">
                {meal.image_url ? (
                  <img
                    src={meal.image_url}
                    alt={meal.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                    {meal.type
                      ? (MEAL_TYPE_LABELS[meal.type] ?? '🍽️').split(' ')[0]
                      : '🍽️'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    {meal.type
                      ? MEAL_TYPE_LABELS[meal.type] ?? meal.type
                      : 'Приём пищи'}
                  </div>
                  <p className="text-slate-100 text-sm font-medium truncate">
                    {meal.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-semibold">
                      {meal.calories ? Math.round(meal.calories) : '—'} ккал
                    </span>
                    <span>Б {meal.protein ? Math.round(meal.protein) : '—'}</span>
                    <span>Ж {meal.fat ? Math.round(meal.fat) : '—'}</span>
                    <span>У {meal.carbs ? Math.round(meal.carbs) : '—'}</span>
                    {meal.cooking_time ? (
                      <span>· ⏱️ {meal.cooking_time} мин</span>
                    ) : null}
                  </div>
                </div>

                {hasRecipe ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-emerald-400 shrink-0"
                    onClick={() =>
                      setExpandedRecipe(isExpanded ? null : recipeKey)
                    }
                  >
                    {isExpanded ? 'Свернуть' : 'Рецепт'}
                  </Button>
                ) : null}
              </div>

              {isExpanded && meal.recipe ? (
                <div className="border-t border-slate-800 p-3 space-y-3 text-sm">
                  {meal.recipe.ingredients ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                        Ингредиенты
                      </div>
                      <p className="text-slate-300 whitespace-pre-line">
                        {meal.recipe.ingredients}
                      </p>
                    </div>
                  ) : null}
                  {meal.recipe.instructions ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                        Приготовление
                      </div>
                      <p className="text-slate-300 whitespace-pre-line">
                        {meal.recipe.instructions}
                      </p>
                    </div>
                  ) : null}
                  {meal.recipe.tips ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                        Советы
                      </div>
                      <p className="text-slate-300 whitespace-pre-line">
                        {meal.recipe.tips}
                      </p>
                    </div>
                  ) : null}
                  {meal.recipe.nutritional_notes ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                        Заметки о питательной ценности
                      </div>
                      <p className="text-slate-300 whitespace-pre-line">
                        {meal.recipe.nutritional_notes}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
