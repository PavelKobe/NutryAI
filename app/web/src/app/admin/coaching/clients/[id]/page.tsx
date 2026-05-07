'use client';

import { useEffect, useRef, useState } from 'react';
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

const POLL_INTERVAL_MS = 12_000;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

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
    queryFn: () =>
      adminGetCoachingClientMealLogs(userId!, { limit: 30 }),
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
      .then((page) => {
        if (cancelled) return;
        setMessages(page.items);
        lastIdRef.current = page.last_id;
      })
      .catch((err) => console.error('Failed to load messages:', err));

    const id = setInterval(async () => {
      try {
        const page = await adminFetchCoachingMessages(userId, lastIdRef.current);
        if (page.items.length > 0) {
          setMessages((prev) => [...prev, ...page.items]);
          lastIdRef.current = page.last_id;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extendMut = useMutation({
    mutationFn: (days: number) => adminExtendCoaching(userId!, days),
    onSuccess: () => {
      toast.success('Подписка продлена');
      void qc.invalidateQueries({ queryKey: ['admin-coaching-client', userId] });
      void qc.invalidateQueries({ queryKey: ['admin-coaching-clients'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

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

            <TabsContent value="profile" className="p-4 space-y-2">
              <KV label="Цель" value={profile?.goal ?? '—'} />
              <KV
                label="Калории"
                value={profile?.target_calories ? `${profile.target_calories} ккал` : '—'}
              />
              <KV
                label="Белки / Жиры / Углеводы"
                value={
                  profile?.target_protein || profile?.target_fat || profile?.target_carbs
                    ? `${profile?.target_protein ?? '—'} / ${profile?.target_fat ?? '—'} / ${profile?.target_carbs ?? '—'} г`
                    : '—'
                }
              />
              <KV label="Аллергии" value={profile?.allergies ?? '—'} />
              <KV
                label="Кухня"
                value={profile?.cuisine_preferences ?? '—'}
              />
            </TabsContent>

            <TabsContent value="diary" className="p-4">
              {!mealLogs?.items?.length ? (
                <p className="text-slate-400 text-sm">
                  Записей в дневнике нет
                </p>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {mealLogs.items.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-800/60 border border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-slate-100 text-sm font-medium">
                            {log.food_name ?? '—'}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {log.meal_type ?? ''} · {formatDateTime(log.logged_at)}
                          </p>
                        </div>
                        <span className="text-emerald-400 text-sm font-semibold">
                          {log.calories ? Math.round(log.calories) : '—'} ккал
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Б {log.protein ?? '—'} / Ж {log.fat ?? '—'} / У {log.carbs ?? '—'} г
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="plan" className="p-4">
              {!mealPlan?.plan_data ? (
                <p className="text-slate-400 text-sm">План питания не задан</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Создан {formatDateTime(mealPlan.created_at)}{' '}
                    {mealPlan.week_start ? `· неделя ${mealPlan.week_start}` : ''}
                  </p>
                  <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 max-h-[480px] overflow-auto whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(mealPlan.plan_data),
                          null,
                          2
                        );
                      } catch {
                        return mealPlan.plan_data;
                      }
                    })()}
                  </pre>
                </>
              )}
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
              const isClient = m.sender_role === 'client';
              return (
                <div
                  key={m.id}
                  className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                      isClient
                        ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                        : 'bg-emerald-600 text-white rounded-br-md'
                    }`}
                  >
                    <div>{m.content}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        isClient ? 'text-slate-500' : 'text-emerald-100/80'
                      }`}
                    >
                      {formatDateTime(m.created_at)}
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

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-800/50">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-slate-200 text-sm text-right">{value}</span>
    </div>
  );
}
