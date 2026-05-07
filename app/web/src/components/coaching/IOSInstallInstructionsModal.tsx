'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share, Plus, Smartphone } from 'lucide-react';

interface IOSInstallInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IOSInstallInstructionsModal({
  open,
  onOpenChange,
}: IOSInstallInstructionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            Установите приложение
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            Чтобы получать уведомления о сообщениях нутрициолога на iPhone,
            добавьте NutryAI на главный экран.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 mt-2">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200">
                Откройте сайт в <b>Safari</b> (если используете другой браузер)
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200 flex items-center gap-1.5">
                Нажмите кнопку
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
                  <Share className="w-3 h-3" /> Поделиться
                </span>
                в нижней панели Safari
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200 flex items-center gap-1.5 flex-wrap">
                Прокрутите и выберите
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
                  <Plus className="w-3 h-3" /> На экран &laquo;Домой&raquo;
                </span>
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200">
                Нажмите <b>«Добавить»</b> в правом верхнем углу
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              5
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-200">
                Откройте приложение с <b>главного экрана</b> и снова нажмите
                «Включить уведомления»
              </p>
            </div>
          </li>
        </ol>

        <p className="text-xs text-slate-500 mt-2">
          Требуется iOS 16.4 или новее.
        </p>
      </DialogContent>
    </Dialog>
  );
}
