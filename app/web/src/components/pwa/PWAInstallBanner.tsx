'use client';

/**
 * PWAInstallBanner — глобальный баннер «Установите как приложение».
 *
 * Состояния и поведение:
 *  - installable (Android/Desktop Chromium с пойманным beforeinstallprompt)
 *      → кнопка вызывает нативный prompt браузера
 *  - manual-installable (Chromium, событие ещё не пришло)
 *      → кнопка открывает ManualInstallInstructionsModal с инструкцией
 *      («меню браузера → Установить»)
 *  - ios-installable (iOS Safari вне standalone)
 *      → кнопка открывает IOSInstallInstructionsModal
 *  - installed / dismissed / idle → не рендерится
 *
 * Скрывается на /admin/*, /payment/*, /login, /auth, /onboarding.
 * Кнопка «X» прячет баннер на 7 дней.
 *
 * Позиционирование:
 *  - mobile: bottom-24 (выше BottomNav, который имеет z-50 / bottom-0)
 *  - sm+: bottom-4
 *  - z-[60] чтобы быть поверх BottomNav
 */

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import IOSInstallInstructionsModal from '@/components/coaching/IOSInstallInstructionsModal';
import ManualInstallInstructionsModal from './ManualInstallInstructionsModal';

const HIDE_PATH_PREFIXES = [
  '/admin',
  '/payment',
  '/login',
  '/auth',
  '/onboarding',
];

export default function PWAInstallBanner() {
  const pathname = usePathname();
  const { state, triggerInstall, dismiss, isIOS } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  if (
    pathname &&
    HIDE_PATH_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return null;
  }

  if (
    state !== 'installable' &&
    state !== 'manual-installable' &&
    state !== 'ios-installable'
  ) {
    return null;
  }

  const handleInstall = async () => {
    if (state === 'ios-installable') {
      setShowIOSModal(true);
      return;
    }
    if (state === 'manual-installable') {
      setShowManualModal(true);
      return;
    }
    // 'installable' — есть deferredPrompt, вызываем нативный диалог
    await triggerInstall();
  };

  const headline =
    state === 'ios-installable' || isIOS
      ? 'Добавьте на главный экран'
      : 'Установите как приложение';

  return (
    <>
      <div className="fixed left-0 right-0 bottom-24 sm:bottom-4 z-[60] px-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto rounded-2xl bg-slate-900/95 backdrop-blur border border-emerald-500/30 shadow-xl shadow-emerald-500/10 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {headline}
            </p>
            <p className="text-xs text-slate-400 truncate">
              Быстрый доступ + push о новых сообщениях
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Установить
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800/50"
              aria-label="Скрыть"
              title="Скрыть на неделю"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <IOSInstallInstructionsModal
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
      />
      <ManualInstallInstructionsModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
      />
    </>
  );
}
