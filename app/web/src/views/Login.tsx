'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { loginWithEmail, persistSessionToken } from '@/lib/emailAuth';
import { loginWithYandex, loginWithVkId } from '@/lib/oauthAuth';
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
      toast.success('С возвращением!');
      await new Promise((r) => setTimeout(r, 700));
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
        <button
          type="button"
          onClick={loginWithYandex}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
            <path d="M13.32 7.2H12.2C10.62 7.2 9.78 8.01 9.78 9.25C9.78 10.65 10.38 11.33 11.6 12.15L12.77 12.94L9.72 17.6H7.8L10.58 13.38C9.09 12.34 8.2 11.31 8.2 9.34C8.2 7.25 9.62 5.8 12.18 5.8H14.94V17.6H13.32V7.2Z" fill="white"/>
          </svg>
          Войти через Яндекс
        </button>
        <button
          type="button"
          onClick={loginWithVkId}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#0077FF"/>
            <path d="M12.9 16.4C8.6 16.4 6.1 13.5 6 8.6H8.1C8.2 12.3 9.8 13.9 11.1 14.2V8.6H13.1V11.6C14.3 11.5 15.6 10 16 8.6H18C17.7 10.3 16.4 11.8 15.5 12.4C16.4 12.9 17.9 14.2 18.5 16.4H16.3C15.8 14.9 14.6 13.7 13.1 13.6V16.4H12.9Z" fill="white"/>
          </svg>
          Войти через VK
        </button>
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
