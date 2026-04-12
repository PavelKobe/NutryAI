'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createPayment } from '@/lib/paymentsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// ─── Fallback constants (used if plans not yet loaded) ────────────────────────
const FALLBACK_MONTHLY = 499;
const FALLBACK_YEARLY = 3990;
const FALLBACK_FEATURES = [
  { text: '100 ИИ-запросов в день', included: true },
  { text: 'Персональный план питания', included: true },
  { text: 'Расширенная аналитика КБЖУ', included: true },
  { text: 'Генерация рецептов под цели', included: true },
  { text: 'Неограниченное добавление блюд', included: true },
  { text: 'Неограниченное распознавание фото', included: true },
  { text: 'Приоритетная поддержка 24/7', included: true },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type UpgradeTrigger = 'limit' | 'trial_expired' | 'subscription_expired' | 'manual';

interface UpgradeSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: UpgradeTrigger;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function UpgradeSubscriptionModal({
  open,
  onOpenChange,
  trigger = 'manual',
}: UpgradeSubscriptionModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>(
    trigger === 'subscription_expired' ? 'yearly' : 'monthly'
  );
  const [isLoading, setIsLoading] = useState(false);
  const { plans } = useAuth();

  // Resolve paid plan data from API, fall back to constants
  const paidPlan = plans.find((p) => p.id === 'plan_all_inclusive_v1');
  const monthlyPrice = paidPlan?.price_monthly ? Number(paidPlan.price_monthly) : FALLBACK_MONTHLY;
  const yearlyPrice = paidPlan?.price_yearly ? Number(paidPlan.price_yearly) : FALLBACK_YEARLY;
  const yearlyPerMonth = Math.round(yearlyPrice / 12);
  const yearlyDiscount = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
  const features = paidPlan?.features?.filter((f) => f.included) ?? FALLBACK_FEATURES;

  const heading =
    trigger === 'limit'
      ? 'Дневной лимит исчерпан'
      : trigger === 'trial_expired'
      ? 'Пробный период завершён'
      : trigger === 'subscription_expired'
      ? 'Требуется Premium'
      : 'Premium';

  const description =
    trigger === 'limit'
      ? 'Вы использовали все 20 ИИ-запросов на сегодня. Оформите Premium, чтобы продолжить.'
      : trigger === 'trial_expired'
      ? 'Ваш 7-дневный пробный период завершён. Оформите подписку для продолжения работы.'
      : trigger === 'subscription_expired'
      ? 'Для использования ИИ-нутрициолога требуется подписка Premium. Перейдите на годовой план и сэкономьте.'
      : 'Получите полный доступ ко всем функциям ИИ-нутрициолога.';

  const handleCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await createPayment(billing);
      window.location.href = res.confirmation_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка создания платежа');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{heading}</DialogTitle>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Billing toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-800/60 mt-1">
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === b
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {b === 'monthly' ? (
                'Ежемесячно'
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Ежегодно
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    −{yearlyDiscount}%
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="text-center py-1">
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-black text-emerald-400">
              {billing === 'monthly' ? monthlyPrice : yearlyPerMonth}
            </span>
            <span className="text-slate-400 text-sm mb-1.5">₽/мес</span>
          </div>
          {billing === 'yearly' && (
            <p className="text-xs text-emerald-500 mt-0.5">
              {yearlyPrice} ₽ в год · экономия {monthlyPrice * 12 - yearlyPrice} ₽
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-1.5 mb-1">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-emerald-400 text-base leading-none">✓</span>
              {f.text}
            </li>
          ))}
        </ul>

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Подождите...' : 'Оформить Premium'}
        </button>

        <p className="text-center text-xs text-slate-600">
          Безопасная оплата · Отмена в любое время
        </p>
      </DialogContent>
    </Dialog>
  );
}
