'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { fetchMealLogsToday, mealLogsTodayQueryKey } from '@/lib/queries/meal_logs_today';
import {
  LayoutDashboard,
  CalendarDays,
  PlusCircle,
  MessageCircle,
  BarChart3,
  PackageSearch,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Главная',   icon: LayoutDashboard },
  { path: '/meal-plan',   label: 'План',       icon: CalendarDays },
  { path: '/add-food',    label: 'Добавить',   icon: PlusCircle },
  { path: '/my-products', label: 'Продукты',   icon: PackageSearch },
  { path: '/chat',        label: 'Чат',        icon: MessageCircle },
  { path: '/analytics',   label: 'Анализ',     icon: BarChart3 },
];

// Prefetch functions for each route's data
const prefetchFns: Record<string, (qc: ReturnType<typeof useQueryClient>) => void> = {
  '/dashboard': (qc) => {
    qc.prefetchQuery({
      queryKey: ['user_profiles'],
      queryFn: () => client.entities.user_profiles.query({ limit: 1 }),
      staleTime: 5 * 60 * 1000,
    });
    qc.prefetchQuery({
      queryKey: [...mealLogsTodayQueryKey],
      queryFn: fetchMealLogsToday,
      staleTime: 60 * 1000,
    });
  },
  '/meal-plan': (qc) => {
    qc.prefetchQuery({
      queryKey: ['meal_plans_active'],
      queryFn: () => client.entities.meal_plans.query({ query: { status: 'active' }, sort: '-created_at', limit: 1 }),
      staleTime: 5 * 60 * 1000,
    });
  },
  '/analytics': (qc) => {
    qc.prefetchQuery({
      queryKey: ['meal_logs_analytics'],
      queryFn: () => client.entities.meal_logs.query({ sort: '-logged_at', limit: 200 }),
      staleTime: 5 * 60 * 1000,
    });
    qc.prefetchQuery({
      queryKey: ['weight_logs'],
      queryFn: () => client.entities.weight_logs.query({ sort: 'logged_at', limit: 30 }),
      staleTime: 5 * 60 * 1000,
    });
  },
  '/my-products': (qc) => {
    qc.prefetchQuery({
      queryKey: ['user_products', { search: '', category: '', skip: 0 }],
      queryFn: () => client.entities.user_products.query({ limit: 20, sort: '-created_at' }),
      staleTime: 30 * 1000,
    });
  },
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handlePrefetch = useCallback(
    (path: string) => {
      const fn = prefetchFns[path];
      if (fn) {
        fn(queryClient);
      }
    },
    [queryClient]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              onMouseEnter={() => handlePrefetch(item.path)}
              onTouchStart={() => handlePrefetch(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.path === '/add-food' ? 'w-7 h-7' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}