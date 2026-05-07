'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPayment } from '@/lib/paymentsApi';
import { coachingStatusKey } from '@/lib/coachingApi';
import AppLayout from '@/components/layout/AppLayout';
import { CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PageState = 'loading' | 'success' | 'pending' | 'error';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { refetchSubscription } = useAuth();
  const [state, setState] = useState<PageState>('loading');
  const [attempts, setAttempts] = useState(0);

  const paymentId = searchParams.get('payment_id');
  const product = searchParams.get('product');
  const isCoaching = product === 'coaching';

  useEffect(() => {
    if (!paymentId) {
      setState('error');
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const payment = await fetchPayment(paymentId);

        if (cancelled) return;

        if (payment.status === 'succeeded') {
          if (isCoaching) {
            void qc.invalidateQueries({ queryKey: coachingStatusKey });
          } else {
            await refetchSubscription();
          }
          setState('success');
        } else if (payment.status === 'canceled') {
          setState('error');
        } else if (attempts < 8) {
          // Платёж ещё обрабатывается — полим каждые 2 сек (до 16 сек)
          setAttempts((a) => a + 1);
          setTimeout(checkStatus, 2000);
        } else {
          setState('pending');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, isCoaching]);

  return (
    <AppLayout title="Оплата">
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
            <p className="text-slate-400">Проверяем статус платежа...</p>
          </>
        )}

        {state === 'success' && isCoaching && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <h1 className="text-2xl font-bold text-white">Сопровождение активировано!</h1>
            <p className="text-slate-400 max-w-xs">
              Оплата прошла успешно. Личный чат с нутрициологом открыт — задайте свой первый вопрос.
            </p>
            <Button
              onClick={() => router.push('/coaching/chat')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Перейти в чат
            </Button>
          </>
        )}

        {state === 'success' && !isCoaching && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <h1 className="text-2xl font-bold text-white">Подписка активирована!</h1>
            <p className="text-slate-400 max-w-xs">
              Оплата прошла успешно. Теперь вам доступно 100 ИИ-запросов в день.
            </p>
            <Button
              onClick={() => router.push('/profile')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8"
            >
              Перейти в профиль
            </Button>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 className="w-12 h-12 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Платёж обрабатывается</h1>
            <p className="text-slate-400 max-w-xs">
              Платёж принят, но ещё обрабатывается. Подписка активируется в течение нескольких минут.
            </p>
            <Button
              onClick={() => router.push('/profile')}
              variant="outline"
              className="border-slate-700 text-slate-300 rounded-xl px-8"
            >
              Перейти в профиль
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-3xl">✕</span>
            </div>
            <h1 className="text-xl font-bold text-white">Что-то пошло не так</h1>
            <p className="text-slate-400 max-w-xs">
              Не удалось подтвердить платёж. Если деньги были списаны — обратитесь в поддержку.
            </p>
            <Button
              onClick={() => router.push('/profile')}
              variant="outline"
              className="border-slate-700 text-slate-300 rounded-xl px-8"
            >
              Назад в профиль
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
