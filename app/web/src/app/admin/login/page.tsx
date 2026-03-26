'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminFetchMe, adminLogin, clearAdminToken, setAdminToken } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await adminLogin(email.trim(), password);
      setAdminToken(token);
      const me = await adminFetchMe();
      if (me.role !== 'admin') {
        clearAdminToken();
        toast.error('Нужна роль admin');
        return;
      }
      toast.success('Вход выполнен');
      router.replace('/admin/users');
    } catch (err) {
      clearAdminToken();
      toast.error(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-100">Админ-панель</CardTitle>
          <CardDescription className="text-slate-400">
            Вход по email и паролю (JWT API)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход…' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
