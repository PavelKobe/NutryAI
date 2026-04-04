'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearAdminToken, getAdminToken } from '@/lib/adminApi';

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLogin) {
      setChecked(true);
      return;
    }
    const t = getAdminToken();
    if (!t) {
      router.replace('/admin/login');
      return;
    }
    setChecked(true);
  }, [isLogin, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (isLogin) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center gap-6 border-b border-slate-800 px-4 py-3">
        <span className="font-semibold text-emerald-400">Nutriaidiary Admin</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/users" className="text-slate-300 hover:text-white hover:underline">
            Пользователи
          </Link>
          <Link href="/admin/payments" className="text-slate-300 hover:text-white hover:underline">
            Платежи
          </Link>
          <Link href="/admin/subscriptions" className="text-slate-300 hover:text-white hover:underline">
            Подписки
          </Link>
          <Link href="/admin/plans" className="text-slate-300 hover:text-white hover:underline">
            Тарифы
          </Link>
        </nav>
        <button
          type="button"
          className="ml-auto text-sm text-slate-400 hover:text-white"
          onClick={() => {
            clearAdminToken();
            router.push('/admin/login');
          }}
        >
          Выйти
        </button>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
