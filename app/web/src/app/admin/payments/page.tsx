'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminPayment } from '@/lib/adminApi';
import {
  adminCapturePayment,
  adminGetPayment,
  adminListPayments,
  adminRefundPayment,
} from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE = 50;

export default function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [skip, setSkip] = useState(0);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-payments', skip, userId, status],
    queryFn: () =>
      adminListPayments({
        skip,
        limit: PAGE,
        user_id: userId.trim() || undefined,
        status: status.trim() || undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-payment', detailId],
    queryFn: () => adminGetPayment(detailId!),
    enabled: !!detailId,
  });

  const captureMut = useMutation({
    mutationFn: () => adminCapturePayment(detailId!),
    onSuccess: () => {
      toast.success('Статус: подтверждён (capture)');
      void qc.invalidateQueries({ queryKey: ['admin-payment', detailId] });
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundMut = useMutation({
    mutationFn: () => adminRefundPayment(detailId!),
    onSuccess: () => {
      toast.success('Статус: возврат (refund)');
      void qc.invalidateQueries({ queryKey: ['admin-payment', detailId] });
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const p = detailQuery.data;
  const canCapture =
    !!p && (p.status === 'pending' || p.status === 'waiting_for_capture');
  const canRefund = !!p && p.status === 'succeeded';

  const total = data?.total ?? 0;
  const canPrev = skip > 0;
  const canNext = skip + PAGE < total;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Платежи</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-slate-400">user_id</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-64 border-slate-700 bg-slate-900 text-slate-100"
            placeholder="UUID пользователя"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400">status</Label>
          <Input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-40 border-slate-700 bg-slate-900 text-slate-100"
            placeholder="pending…"
          />
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => setSkip(0)}
          className="bg-slate-800 text-slate-100"
        >
          Применить
        </Button>
      </div>

      {isLoading && <p className="text-slate-400">Загрузка…</p>}
      {isError && (
        <p className="text-red-400">{error instanceof Error ? error.message : 'Ошибка'}</p>
      )}

      {data && (
        <>
          <p className="text-sm text-slate-500">
            Всего: {total}, показано {data.items.length}
          </p>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-900">
                  <TableHead className="text-slate-300">ID</TableHead>
                  <TableHead className="text-slate-300">user_id</TableHead>
                  <TableHead className="text-slate-300">Сумма</TableHead>
                  <TableHead className="text-slate-300">Статус</TableHead>
                  <TableHead className="text-slate-300">Создан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p: AdminPayment) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer border-slate-800 hover:bg-slate-900/80"
                    onClick={() => setDetailId(p.id)}
                  >
                    <TableCell className="max-w-[120px] truncate font-mono text-xs text-slate-300">
                      {p.id}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate font-mono text-xs text-slate-300">
                      {p.user_id}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {p.amount_value} {p.amount_currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!canPrev}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE))}
            >
              Назад
            </Button>
            <Button variant="outline" disabled={!canNext} onClick={() => setSkip((s) => s + PAGE)}>
              Вперёд
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={!!detailId}
        onOpenChange={(o) => {
          if (!o) setDetailId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали платежа</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading && <p className="text-slate-400">Загрузка…</p>}
          {detailQuery.isError && (
            <p className="text-red-400">
              {detailQuery.error instanceof Error ? detailQuery.error.message : 'Ошибка'}
            </p>
          )}
          {detailQuery.data && (
            <>
              <p className="text-xs text-slate-500">
                Только смена статуса в БД; позже будет вызов YooKassa.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!canCapture || captureMut.isPending}
                  onClick={() => captureMut.mutate()}
                >
                  Подтвердить (capture)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canRefund || refundMut.isPending}
                  onClick={() => refundMut.mutate()}
                >
                  Возврат (refund)
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-all rounded bg-slate-900 p-3 text-xs text-slate-300">
                {JSON.stringify(detailQuery.data, null, 2)}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
