'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  createCoachingPayment,
  fetchCoachingPlan,
  type CoachingPlan,
} from '@/lib/coachingApi';

const FALLBACK_PRICE = 15000;
const FALLBACK_FEATURES = [
  { text: 'Персональный чат с нутрициологом 24/7', included: true },
  { text: 'Индивидуальная корректировка плана питания', included: true },
  { text: 'Разбор дневника питания', included: true },
  { text: 'Поддержка и мотивация на пути к цели', included: true },
];

interface CoachingPaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Заголовок: 'activate' для первичной покупки, 'extend' для продления. */
  mode?: 'activate' | 'extend';
}

export default function CoachingPaywallModal({
  open,
  onOpenChange,
  mode = 'activate',
}: CoachingPaywallModalProps) {
  const [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchCoachingPlan()
      .then(setPlan)
      .catch((err) => {
        console.error('Failed to load coaching plan:', err);
      });
  }, [open]);

  const price = plan?.price ? Number(plan.price) : FALLBACK_PRICE;
  const name = plan?.name ?? 'Сопровождение нутрициолога 24/7';
  const description =
    plan?.description ??
    'Индивидуальное сопровождение нутрициолога — личный чат с экспертом и поддержка 24/7.';
  const features =
    plan?.features?.filter((f) => f.included) ?? FALLBACK_FEATURES;
  const durationDays = plan?.duration_days ?? 30;

  const heading =
    mode === 'extend' ? 'Продление сопровождения' : name;

  const handleCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await createCoachingPayment();
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
          <DialogDescription className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Price */}
        <div className="text-center py-2">
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-black text-emerald-400">
              {price.toLocaleString('ru-RU')}
            </span>
            <span className="text-slate-400 text-sm mb-1.5">₽</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            на {durationDays} дн. · разовый платёж
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-1.5 mb-1">
          {features.map((f) => (
            <li
              key={f.text}
              className="flex items-start gap-2 text-sm text-slate-300"
            >
              <span className="text-emerald-400 text-base leading-none mt-0.5">✓</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleCheckout}
          disabled={isLoading || !plan?.is_active}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Подождите...' : `Оплатить ${price.toLocaleString('ru-RU')} ₽`}
        </button>

        <p className="text-center text-xs text-slate-600">
          Безопасная оплата через ЮKassa
        </p>
      </DialogContent>
    </Dialog>
  );
}
