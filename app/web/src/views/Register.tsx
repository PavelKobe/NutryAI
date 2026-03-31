'use client';

import { useState } from 'react';
import Link from 'next/link';
import { persistSessionToken, registerWithEmail } from '@/lib/emailAuth';
import { loginWithYandex } from '@/lib/oauthAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
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
      window.location.href = '/onboarding';
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
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-500">или</span>
          </div>
        </div>
        <button
          type="button"
          onClick={loginWithYandex}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
            <path d="M13.32 7.2H12.2C10.62 7.2 9.78 8.01 9.78 9.25C9.78 10.65 10.38 11.33 11.6 12.15L12.77 12.94L9.72 17.6H7.8L10.58 13.38C9.09 12.34 8.2 11.31 8.2 9.34C8.2 7.25 9.62 5.8 12.18 5.8H14.94V17.6H13.32V7.2Z" fill="white"/>
          </svg>
          Зарегистрироваться через Яндекс
        </button>
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
