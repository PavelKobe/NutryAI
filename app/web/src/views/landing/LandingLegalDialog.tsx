'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Общие классы для типографики юридических текстов внутри белой карточки */
export const LANDING_LEGAL_BODY_CLASS =
  'max-w-none space-y-3 text-sm leading-relaxed text-[#555] [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#2c3e50] [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-[#34495e] [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1.5';

const contentShellClass =
  'max-h-[90vh] w-[min(100vw-1.5rem,52rem)] max-w-[52rem] gap-0 overflow-hidden border border-white/10 bg-[#0a120a] p-0 text-left shadow-xl sm:rounded-2xl';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function LandingLegalDialog({ open, onOpenChange, title, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={contentShellClass}
        style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4 text-left sm:px-6">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div
          className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 py-5 sm:px-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="rounded-2xl bg-white p-6 text-[#333] shadow-inner sm:p-8">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
