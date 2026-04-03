'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <AppLayout title="Оплата отменена">
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <span className="text-slate-400 text-3xl">✕</span>
        </div>
        <h1 className="text-xl font-bold text-white">Оплата отменена</h1>
        <p className="text-slate-400 max-w-xs">
          Вы отменили оплату. Ваш тариф не изменился.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/profile')}
            variant="outline"
            className="border-slate-700 text-slate-300 rounded-xl"
          >
            В профиль
          </Button>
          <Button
            onClick={() => router.push('/chat')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Попробовать позже
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
