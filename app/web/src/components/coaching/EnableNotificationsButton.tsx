'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getCurrentSubscription,
  getPermission,
  isIOSWithoutPWA,
  isPushSupported,
  subscribeUser,
  unsubscribeUser,
  type PushPermission,
} from '@/lib/push';
import IOSInstallInstructionsModal from './IOSInstallInstructionsModal';

type ButtonState =
  | 'unsupported'
  | 'ios-no-pwa'
  | 'default'
  | 'denied'
  | 'granted-no-sub'
  | 'granted';

export default function EnableNotificationsButton() {
  const [state, setState] = useState<ButtonState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Initial detection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) {
          setState(isIOSWithoutPWA() ? 'ios-no-pwa' : 'unsupported');
        }
        return;
      }
      if (isIOSWithoutPWA()) {
        if (!cancelled) setState('ios-no-pwa');
        return;
      }
      const perm: PushPermission = getPermission();
      if (perm === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      if (perm === 'default') {
        if (!cancelled) setState('default');
        return;
      }
      // granted
      const sub = await getCurrentSubscription();
      if (!cancelled) setState(sub ? 'granted' : 'granted-no-sub');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await subscribeUser();
      setState('granted');
      toast.success('Уведомления включены');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось включить';
      if (getPermission() === 'denied') {
        setState('denied');
        toast.error('Уведомления заблокированы в браузере');
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (busy) return;
    if (
      !window.confirm(
        'Выключить уведомления? Вы перестанете получать пуш о новых сообщениях.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await unsubscribeUser();
      setState('granted-no-sub');
      toast.success('Уведомления выключены');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'unsupported') {
    return null;
  }

  if (state === 'ios-no-pwa') {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowIOSModal(true)}
          className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          Установить приложение
        </Button>
        <IOSInstallInstructionsModal
          open={showIOSModal}
          onOpenChange={setShowIOSModal}
        />
      </>
    );
  }

  if (state === 'denied') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title="Уведомления заблокированы. Разрешите их в настройках браузера для этого сайта."
        className="border-slate-700 text-slate-500"
      >
        <BellOff className="w-3.5 h-3.5 mr-1.5" />
        Заблокировано
      </Button>
    );
  }

  if (state === 'granted') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleDisable}
        disabled={busy}
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      >
        <Bell className="w-3.5 h-3.5 mr-1.5" />
        Включены
      </Button>
    );
  }

  // 'default' | 'granted-no-sub'
  return (
    <Button
      size="sm"
      onClick={handleEnable}
      disabled={busy}
      className="bg-emerald-500 hover:bg-emerald-600 text-white"
    >
      <Bell className="w-3.5 h-3.5 mr-1.5" />
      {busy ? 'Включение...' : 'Включить уведомления'}
    </Button>
  );
}
