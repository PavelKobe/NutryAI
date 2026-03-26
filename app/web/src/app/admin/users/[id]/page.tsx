'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  adminDeleteUser,
  adminFetchMe,
  adminGetUser,
} from '@/lib/adminApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['admin-me'],
    queryFn: adminFetchMe,
  });

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminGetUser(id),
    enabled: !!id,
  });

  const delMut = useMutation({
    mutationFn: () => adminDeleteUser(id),
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success('Пользователь удалён');
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      router.replace('/admin/users');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSelf = me?.id === id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/users">← К списку</Link>
        </Button>
      </div>

      {isLoading && <p className="text-slate-400">Загрузка…</p>}
      {isError && (
        <p className="text-red-400">{error instanceof Error ? error.message : 'Ошибка'}</p>
      )}

      {user && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-100">{user.email}</CardTitle>
              <p className="mt-1 font-mono text-xs text-slate-500">{user.id}</p>
            </div>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Имя:</span> {user.name ?? '—'}
            </p>
            <p>
              <span className="text-slate-500">Активен:</span> {user.is_active ? 'да' : 'нет'}
            </p>
            <p>
              <span className="text-slate-500">Создан:</span>{' '}
              {user.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : '—'}
            </p>
            <p>
              <span className="text-slate-500">Последний вход:</span>{' '}
              {user.last_login ? new Date(user.last_login).toLocaleString('ru-RU') : '—'}
            </p>
            <div className="pt-4">
              {isSelf ? (
                <p className="text-amber-500/90">Нельзя удалить свою учётную запись.</p>
              ) : (
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Удалить пользователя
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Действие необратимо. Связанные платежи (если есть) удалятся каскадом; прочие данные с
              этим user_id могут остаться в БД.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-100">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                delMut.mutate();
              }}
              disabled={delMut.isPending}
            >
              {delMut.isPending ? 'Удаление…' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
