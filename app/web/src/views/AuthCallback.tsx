'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Старый редирект с ?token= или переход на /login. */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('isLougOutManual', 'false');
      router.replace('/dashboard');
      return;
    }
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
        <p>Перенаправление…</p>
      </div>
    </div>
  );
}
