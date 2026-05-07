'use client';

/**
 * usePWAInstall — управление установкой PWA.
 *
 * Состояния:
 *   idle             — ничего не делаем (нет события или платформа не поддерживает)
 *   installable      — Android/Desktop Chromium: пойман beforeinstallprompt
 *   ios-installable  — iOS Safari вне standalone: предлагаем инструкцию
 *   dismissed        — пользователь нажал «Не сейчас», TTL 7 дней
 *   installed        — уже установлено (display-mode standalone или appinstalled)
 *
 * triggerInstall() — вызывает нативный prompt браузера (Android), возвращает outcome.
 * dismiss()        — записывает дату скрытия в localStorage.
 */

import { useEffect, useState } from 'react';
import { isIOS, isIOSWithoutPWA, isPWAInstalled } from '@/lib/push';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAInstallState =
  | 'idle'
  | 'installable'
  | 'ios-installable'
  | 'dismissed'
  | 'installed';

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>('idle');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isPWAInstalled()) {
      setState('installed');
      return;
    }

    if (isDismissedRecently()) {
      setState('dismissed');
      return;
    }

    if (isIOSWithoutPWA()) {
      setState('ios-installable');
      // iOS не кидает beforeinstallprompt — ничего больше не слушаем
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState('installable');
    };
    const handleInstalled = () => {
      setState('installed');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function triggerInstall(): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setState('installed');
        setDeferredPrompt(null);
      } else {
        // Юзер отменил в нативном диалоге — пометим как dismissed
        // (но не записываем в localStorage — пусть появится снова при следующей сессии)
      }
      return choice.outcome;
    } catch (err) {
      console.warn('PWA install prompt failed:', err);
      return 'unavailable';
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setState('dismissed');
  }

  return {
    state,
    triggerInstall,
    dismiss,
    isIOS: isIOS(),
  };
}
