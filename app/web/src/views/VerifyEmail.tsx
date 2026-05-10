'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  persistSessionToken,
  resendVerification,
  ResendCooldownError,
  verifyEmail,
  VerifyEmailFailure,
} from '@/lib/emailAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RESEND_COOLDOWN_SECONDS = 60;

type Props = {
  initialToken: string;
  email: string;
};

export default function VerifyEmail({ initialToken, email }: Props) {
  const [token, setToken] = useState(initialToken);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [tokenExpired, setTokenExpired] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || submitting || tokenExpired) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token: accessToken } = await verifyEmail(token, code);
      persistSessionToken(accessToken);
      toast.success('Email подтверждён!');
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = '/onboarding';
    } catch (err) {
      if (err instanceof VerifyEmailFailure) {
        setError(err.message);
        if (err.info.kind === 'token_invalid') {
          setTokenExpired(true);
        }
        if (err.info.kind === 'expired' || err.info.kind === 'locked' || err.info.kind === 'not_found') {
          setCode('');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Ошибка подтверждения');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending || tokenExpired) return;
    setResending(true);
    setError(null);
    try {
      await resendVerification(token);
      toast.success('Новый код отправлен');
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ResendCooldownError) {
        const remaining = err.canResendAt
          ? Math.max(1, Math.ceil(err.canResendAt - Date.now() / 1000))
          : RESEND_COOLDOWN_SECONDS;
        setCooldown(remaining);
        setError(`Подождите ${remaining} сек перед повторной отправкой`);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось отправить код');
      }
    } finally {
      setResending(false);
    }
  };

  // Suppress unused-setter warning: token is reset via state if backend rotates it.
  void setToken;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Подтверждение email</h1>
          <p className="text-slate-400 text-sm mt-1">
            Мы отправили 6-значный код на{' '}
            <span className="text-slate-200">{email || 'ваш email'}</span>. Введите его ниже.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="000000"
            className="bg-slate-950 border-slate-700 text-center text-2xl tracking-[0.5em] font-mono"
            aria-label="Код подтверждения"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={code.length !== 6 || submitting || tokenExpired}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Проверяем…' : 'Подтвердить'}
          </Button>
        </form>

        <div className="text-center text-sm">
          {cooldown > 0 ? (
            <span className="text-slate-500">
              Повторная отправка через {cooldown} сек
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resending || tokenExpired}
              className="text-emerald-400 hover:underline disabled:text-slate-600 disabled:no-underline"
            >
              {resending ? 'Отправка…' : 'Отправить код повторно'}
            </button>
          )}
        </div>

        <div className="text-center text-sm text-slate-500 space-y-1">
          <p>
            Не пришло письмо? Проверьте папку «Спам».
          </p>
          <p>
            <Link href="/register" className="text-slate-400 hover:text-slate-200">
              Назад к регистрации
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
