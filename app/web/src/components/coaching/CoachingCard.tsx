'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchCoachingStatus,
  type CoachingStatus,
} from '@/lib/coachingApi';
import CoachingPaywallModal from './CoachingPaywallModal';
import { useUnreadCoaching } from '@/hooks/useUnreadCoaching';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CoachingCard() {
  const router = useRouter();
  const [status, setStatus] = useState<CoachingStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMode, setPaywallMode] = useState<'activate' | 'extend'>('activate');

  // Подгружаем число непрочитанных только если активна подписка
  const { data: unread = 0 } = useUnreadCoaching({
    enabled: status?.status === 'active',
  });

  useEffect(() => {
    let cancelled = false;
    fetchCoachingStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((err) => {
        console.error('Failed to fetch coaching status:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 animate-pulse h-32" />
    );
  }

  const price = Number(status.plan.price).toLocaleString('ru-RU');

  // ── State: none — never purchased ──────────────────────────────────────────
  if (status.status === 'none') {
    return (
      <>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white">{status.plan.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Личный чат и поддержка эксперта 24/7
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-amber-400 font-bold">
              {price} ₽ / {status.plan.duration_days} дн.
            </span>
            <Button
              size="sm"
              onClick={() => {
                setPaywallMode('activate');
                setShowPaywall(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
            >
              Активировать
            </Button>
          </div>
        </div>

        <CoachingPaywallModal
          open={showPaywall}
          onOpenChange={setShowPaywall}
          mode={paywallMode}
        />
      </>
    );
  }

  // ── State: active ──────────────────────────────────────────────────────────
  if (status.status === 'active') {
    const expiringSoon = status.days_left <= 7;

    return (
      <>
        <div
          className={`p-4 rounded-2xl border ${
            expiringSoon
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
              : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                expiringSoon ? 'bg-amber-500/20' : 'bg-emerald-500/20'
              }`}
            >
              <MessageCircle
                className={`w-5 h-5 ${
                  expiringSoon ? 'text-amber-400' : 'text-emerald-400'
                }`}
              />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-slate-950">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">
                  Сопровождение активно
                </h3>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    expiringSoon
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {status.days_left} дн.
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Действует до {formatDate(status.expires_at)}
              </p>
            </div>
          </div>

          {expiringSoon && (
            <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Скоро истекает. Не забудьте продлить.</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => router.push('/coaching/chat')}
              className={`flex-1 rounded-xl text-white ${
                expiringSoon
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Открыть чат
            </Button>
            {expiringSoon && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPaywallMode('extend');
                  setShowPaywall(true);
                }}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl"
              >
                Продлить
              </Button>
            )}
          </div>
        </div>

        <CoachingPaywallModal
          open={showPaywall}
          onOpenChange={setShowPaywall}
          mode={paywallMode}
        />
      </>
    );
  }

  // ── State: expired ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-300">
              Сопровождение завершено
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Истекло {formatDate(status.expires_at)} · история доступна
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setPaywallMode('extend');
              setShowPaywall(true);
            }}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Продлить · {price} ₽
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/coaching/chat')}
            className="border-slate-700 text-slate-400 hover:bg-slate-800 rounded-xl"
          >
            История
          </Button>
        </div>
      </div>

      <CoachingPaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        mode={paywallMode}
      />
    </>
  );
}
