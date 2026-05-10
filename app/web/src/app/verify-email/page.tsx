'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VerifyEmail from '@/views/VerifyEmail';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Ссылка некорректна</h1>
          <p className="text-slate-400 text-sm">
            Токен подтверждения отсутствует. Начните регистрацию заново.
          </p>
          <a href="/register" className="inline-block text-emerald-400 hover:underline text-sm">
            На регистрацию
          </a>
        </div>
      </div>
    );
  }

  return <VerifyEmail initialToken={token} email={email} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
