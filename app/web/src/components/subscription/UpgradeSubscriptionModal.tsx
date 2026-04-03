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
import { Loader2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHLY_PRICE = 499;
const YEARLY_PRICE = 3990;
const YEARLY_PER_MONTH = Math.round(YEARLY_PRICE / 12); // 332₽/мес
const YEARLY_DISCOUNT = Math.round(
  ((MONTHLY_PRICE * 12 - YEARLY_PRICE) / (MONTHLY_PRICE * 12)) * 100
); // 33%

const FEATURES = [
  '100 ИИ-запросов в день',
  'Персональный план питания',
  'Расширенная аналитика КБЖУ',
  'Генерация рецептов под цели',
  'Неограниченное добавление блюд',
  'Неограниченное распознавание фото',
  'Приоритетная поддержка 24/7',
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type UpgradeTrigger = 'limit' | 'trial_expired' | 'manual';

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
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const heading =
    trigger === 'limit'
      ? 'Дневной лимит исчерпан'
      : trigger === 'trial_expired'
      ? 'Пробный период завершён'
      : 'All Inclusive';

  const description =
    trigger === 'limit'
      ? 'Вы использовали все 20 ИИ-запросов на сегодня. Оформите All Inclusive, чтобы продолжить.'
      : trigger === 'trial_expired'
      ? 'Ваш 7-дневный пробный период завершён. Оформите подписку для продолжения работы.'
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
                    −{YEARLY_DISCOUNT}%
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
              {billing === 'monthly' ? MONTHLY_PRICE : YEARLY_PER_MONTH}
            </span>
            <span className="text-slate-400 text-sm mb-1.5">₽/мес</span>
          </div>
          {billing === 'yearly' && (
            <p className="text-xs text-emerald-500 mt-0.5">
              {YEARLY_PRICE} ₽ в год · экономия {MONTHLY_PRICE * 12 - YEARLY_PRICE} ₽
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-1.5 mb-1">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-emerald-400 text-base leading-none">✓</span>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Подождите...' : 'Оформить All Inclusive'}
        </button>

        <p className="text-center text-xs text-slate-600">
          Безопасная оплата · Отмена в любое время
        </p>
      </DialogContent>
    </Dialog>
  );
}
