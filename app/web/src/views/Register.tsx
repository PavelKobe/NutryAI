'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { persistSessionToken, registerWithEmail } from '@/lib/emailAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Пароль не короче 8 символов');
      return;
    }
    setLoading(true);
    try {
      const { token } = await registerWithEmail(email.trim(), password, name.trim() || undefined);
      persistSessionToken(token);
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Регистрация</h1>
          <p className="text-slate-400 text-sm mt-1">Укажите email и пароль (мин. 8 символов)</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя (необязательно)</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-950 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-slate-950 border-slate-700"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Создание…' : 'Зарегистрироваться'}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
