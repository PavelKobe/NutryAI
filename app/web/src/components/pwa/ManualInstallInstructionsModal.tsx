'use client';

import { isIOS } from '@/lib/push';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical, Download, Smartphone } from 'lucide-react';

interface ManualInstallInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Модалка для Android / Desktop Chrome / Edge, когда `beforeinstallprompt`
 * не сработал (например, при первом визите или после dismissal браузера).
 * Объясняет, как установить вручную через меню браузера.
 */
export default function ManualInstallInstructionsModal({
  open,
  onOpenChange,
}: ManualInstallInstructionsModalProps) {
  const ios = isIOS();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            Установите приложение
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            {ios
              ? 'На iOS установка идёт через Safari. Если вы в другом браузере — откройте сайт в Safari.'
              : 'Установите NutriAI как приложение через меню браузера.'}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 mt-2">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200 flex items-center gap-1.5 flex-wrap">
                Откройте меню браузера
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
                  <MoreVertical className="w-3 h-3" /> ⋮
                </span>
                в правом верхнем углу
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200 flex items-center gap-1.5 flex-wrap">
                Выберите
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
                  <Download className="w-3 h-3" /> Установить приложение
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Может также называться: «Установить NutriAI», «Добавить на
                главный экран», «Add to Home Screen»
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200">
                Подтвердите установку — иконка появится на главном экране
              </p>
            </div>
          </li>
        </ol>

        <p className="text-xs text-slate-500 mt-2">
          Если пункт «Установить приложение» не появился — продолжайте
          использовать сайт, браузер предложит установку через несколько
          посещений.
        </p>
      </DialogContent>
    </Dialog>
  );
}
