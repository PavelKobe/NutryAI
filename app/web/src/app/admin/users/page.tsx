'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminUser, AdminUserPatch } from '@/lib/adminApi';
import { adminListUsers, adminPatchUser } from '@/lib/adminApi';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE = 50;

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [skip, setSkip] = useState(0);
  const [emailContains, setEmailContains] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user');
  const [formActive, setFormActive] = useState(true);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', skip, emailContains, roleFilter],
    queryFn: () =>
      adminListUsers({
        skip,
        limit: PAGE,
        email_contains: emailContains.trim() || undefined,
        role: roleFilter || undefined,
      }),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUserPatch }) =>
      adminPatchUser(id, body),
    onSuccess: () => {
      toast.success('Пользователь обновлён');
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(u: AdminUser) {
    setEditing(u);
    setFormName(u.name ?? '');
    setFormRole(u.role === 'admin' ? 'admin' : 'user');
    setFormActive(u.is_active !== false);
  }

  function saveEdit() {
    if (!editing) return;
    const body: AdminUserPatch = {
      name: formName.trim() || undefined,
      role: formRole,
      is_active: formActive,
    };
    patchMut.mutate({ id: editing.id, body });
  }

  const total = data?.total ?? 0;
  const canPrev = skip > 0;
  const canNext = skip + PAGE < total;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Пользователи</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-slate-400">Email содержит</Label>
          <Input
            value={emailContains}
            onChange={(e) => setEmailContains(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSkip(0)}
            className="w-56 border-slate-700 bg-slate-900 text-slate-100"
            placeholder="фильтр"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400">Роль</Label>
          <Select value={roleFilter || '__all'} onValueChange={(v) => setRoleFilter(v === '__all' ? '' : v)}>
            <SelectTrigger className="w-40 border-slate-700 bg-slate-900 text-slate-100">
              <SelectValue placeholder="все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">все</SelectItem>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
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
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Имя</TableHead>
                  <TableHead className="text-slate-300">Роль</TableHead>
                  <TableHead className="text-slate-300">Активен</TableHead>
                  <TableHead className="text-slate-300" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow key={u.id} className="border-slate-800 hover:bg-slate-900/80">
                    <TableCell className="text-slate-200">{u.email}</TableCell>
                    <TableCell className="text-slate-300">{u.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{u.is_active ? 'да' : 'нет'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/admin/users/${u.id}`}>Подробнее</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          Изменить
                        </Button>
                      </div>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактирование</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">{editing?.email}</p>
            <div className="space-y-1">
              <Label>Имя</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>
            <div className="space-y-1">
              <Label>Роль</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'user' | 'admin')}>
                <SelectTrigger className="border-slate-700 bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} id="active" />
              <Label htmlFor="active">Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button onClick={saveEdit} disabled={patchMut.isPending}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
