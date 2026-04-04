'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminSubscriptionActivate } from '@/lib/adminApi';
import {
  adminActivateSubscription,
  adminDeactivateSubscription,
  adminListPlans,
  adminListSubscriptions,
} from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE = 50;

const STATUS_COLORS: Record<string, string> = {
  active: 'default',
  expired: 'destructive',
  cancelled: 'secondary',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

export default function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [formPlanId, setFormPlanId] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formPeriod, setFormPeriod] = useState<'monthly' | 'yearly' | 'custom' | 'unlimited'>('monthly');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-subscriptions', skip, statusFilter],
    queryFn: () =>
      adminListSubscriptions({ skip, limit: PAGE, status: statusFilter || undefined }),
  });

  const { data: plans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: adminListPlans,
  });

  const activateMut = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: AdminSubscriptionActivate }) =>
      adminActivateSubscription(userId, body),
    onSuccess: () => {
      toast.success('Подписка активирована');
      setActivatingUserId(null);
      void qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (userId: string) => adminDeactivateSubscription(userId),
    onSuccess: () => {
      toast.success('Подписка деактивирована');
      void qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handlePeriodChange(period: 'monthly' | 'yearly' | 'custom' | 'unlimited') {
    setFormPeriod(period);
    const d = new Date();
    if (period === 'monthly') {
      d.setDate(d.getDate() + 30);
      setFormExpiresAt(d.toISOString().split('T')[0]);
    } else if (period === 'yearly') {
      d.setDate(d.getDate() + 365);
      setFormExpiresAt(d.toISOString().split('T')[0]);
    } else if (period === 'unlimited') {
      setFormExpiresAt('');
    }
    // 'custom' → keep current value, show datepicker
  }

  function openActivate(userId: string, currentPlanId: string) {
    setActivatingUserId(userId);
    setFormPlanId(currentPlanId);
    setFormPeriod('monthly');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormExpiresAt(d.toISOString().split('T')[0]);
  }

  function saveActivate() {
    if (!activatingUserId || !formPlanId) return;
    activateMut.mutate({
      userId: activatingUserId,
      body: {
        plan_id: formPlanId,
        expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      },
    });
  }

  const total = data?.total ?? 0;
  const canPrev = skip > 0;
  const canNext = skip + PAGE < total;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Подписки пользователей</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-slate-400">Статус</Label>
          <Select
            value={statusFilter || '__all'}
            onValueChange={(v) => { setStatusFilter(v === '__all' ? '' : v); setSkip(0); }}
          >
            <SelectTrigger className="w-44 border-slate-700 bg-slate-900 text-slate-100">
              <SelectValue placeholder="все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">все</SelectItem>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="expired">expired</SelectItem>
              <SelectItem value="cancelled">cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-slate-400">Загрузка…</p>}
      {isError && <p className="text-red-400">Ошибка загрузки</p>}

      {data && (
        <>
          <p className="text-sm text-slate-500">Всего: {total}, показано {data.items.length}</p>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-900">
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Тариф</TableHead>
                  <TableHead className="text-slate-300">Статус</TableHead>
                  <TableHead className="text-slate-300">Запросы сегодня</TableHead>
                  <TableHead className="text-slate-300">Срок действия</TableHead>
                  <TableHead className="text-slate-300" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((sub) => (
                  <TableRow key={sub.user_id} className="border-slate-800 hover:bg-slate-900/80">
                    <TableCell className="text-slate-200">{sub.user_email}</TableCell>
                    <TableCell className="text-slate-300">{sub.plan_name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[sub.status] as 'default' | 'destructive' | 'secondary' ?? 'secondary'}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {sub.ai_requests_today} / {sub.daily_ai_limit}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {sub.expires_at ? fmt(sub.expires_at) : 'бессрочно'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActivate(sub.user_id, sub.plan_id)}
                        >
                          Активировать
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={sub.status === 'cancelled' || deactivateMut.isPending}
                          onClick={() => deactivateMut.mutate(sub.user_id)}
                        >
                          Деактивировать
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" disabled={!canPrev} onClick={() => setSkip((s) => Math.max(0, s - PAGE))}>
              Назад
            </Button>
            <Button variant="outline" disabled={!canNext} onClick={() => setSkip((s) => s + PAGE)}>
              Вперёд
            </Button>
          </div>
        </>
      )}

      {/* Activate dialog */}
      <Dialog open={!!activatingUserId} onOpenChange={(o) => !o && setActivatingUserId(null)}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Активировать подписку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Тарифный план</Label>
              <Select value={formPlanId} onValueChange={setFormPlanId}>
                <SelectTrigger className="border-slate-700 bg-slate-900">
                  <SelectValue placeholder="выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Срок действия</Label>
              <Select value={formPeriod} onValueChange={(v) => handlePeriodChange(v as 'monthly' | 'yearly' | 'custom' | 'unlimited')}>
                <SelectTrigger className="border-slate-700 bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">1 месяц (+30 дней)</SelectItem>
                  <SelectItem value="yearly">1 год (+365 дней)</SelectItem>
                  <SelectItem value="custom">Произвольная дата</SelectItem>
                  <SelectItem value="unlimited">Бессрочно</SelectItem>
                </SelectContent>
              </Select>
              {formPeriod === 'custom' && (
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="mt-2 border-slate-700 bg-slate-900"
                />
              )}
              {formPeriod !== 'unlimited' && formExpiresAt && formPeriod !== 'custom' && (
                <p className="text-xs text-slate-500">Истекает: {new Date(formExpiresAt).toLocaleDateString('ru-RU')}</p>
              )}
              {formPeriod === 'unlimited' && (
                <p className="text-xs text-slate-500">Подписка без даты истечения</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingUserId(null)}>Отмена</Button>
            <Button
              onClick={saveActivate}
              disabled={!formPlanId || activateMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Активировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
