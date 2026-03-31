'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loginWithEmail, persistSessionToken } from '@/lib/emailAuth';
import { loginWithYandex } from '@/lib/oauthAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await loginWithEmail(email.trim(), password);
      persistSessionToken(token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Вход</h1>
          <p className="text-slate-400 text-sm mt-1">Email и пароль</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-950 border-slate-700"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Вход…' : 'Войти'}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-500">или</span>
          </div>
        </div>
        <Button
          type="button"
          onClick={loginWithYandex}
          className="w-full bg-[#FC3F1D] hover:bg-[#e8361a] text-white"
        >
          Войти через Яндекс
        </Button>
        <p className="text-center text-sm text-slate-400">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline">
            Регистрация
          </Link>
        </p>
        <p className="text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
