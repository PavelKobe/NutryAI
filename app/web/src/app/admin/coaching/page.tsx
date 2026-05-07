'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { adminListCoachingClients } from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

export default function AdminCoachingClientsPage() {
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'all'>(
    'active'
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-coaching-clients', skip, search, statusFilter],
    queryFn: () =>
      adminListCoachingClients({
        skip,
        limit: PAGE,
        search: search.trim() || undefined,
        status: statusFilter,
      }),
  });

  const total = data?.total ?? 0;
  const canPrev = skip > 0;
  const canNext = skip + PAGE < total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">
          Клиенты на сопровождении
        </h1>
        <Button asChild variant="outline" className="border-slate-700">
          <Link href="/admin/coaching/plan">Карточка услуги</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-slate-400">Поиск (email / имя)</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSkip(0)}
            className="w-64 border-slate-700 bg-slate-900 text-slate-100"
            placeholder="фильтр"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400">Статус</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as 'active' | 'expired' | 'all')
            }
          >
            <SelectTrigger className="w-40 border-slate-700 bg-slate-900 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">активные</SelectItem>
              <SelectItem value="expired">истёкшие</SelectItem>
              <SelectItem value="all">все</SelectItem>
            </SelectContent>
          </Select>
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
        <p className="text-red-400">
          {error instanceof Error ? error.message : 'Ошибка'}
        </p>
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
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Имя</TableHead>
                  <TableHead className="text-slate-300">Статус</TableHead>
                  <TableHead className="text-slate-300">До</TableHead>
                  <TableHead className="text-slate-300">Дн.</TableHead>
                  <TableHead className="text-slate-300">Посл. сообщение</TableHead>
                  <TableHead className="text-slate-300" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow
                    key={c.user_id}
                    className="border-slate-800 hover:bg-slate-900/80"
                  >
                    <TableCell className="text-slate-200">{c.user_email}</TableCell>
                    <TableCell className="text-slate-300">
                      {c.user_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === 'active' ? 'default' : 'secondary'}
                      >
                        {c.status === 'active' ? 'активен' : 'истёк'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {formatDate(c.expires_at)}
                    </TableCell>
                    <TableCell className="text-slate-300">{c.days_left}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {formatDate(c.last_message_at)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/admin/coaching/clients/${c.user_id}`}>
                          Открыть
                        </Link>
                      </Button>
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
            <Button
              variant="outline"
              disabled={!canNext}
              onClick={() => setSkip((s) => s + PAGE)}
            >
              Вперёд
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
