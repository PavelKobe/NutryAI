'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isLoading?: boolean;
}

export default function BarcodeScanner({ onScan, isLoading }: BarcodeScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraActive(false);
  }, []);

  // Показываем video-элемент, потом запускаем ZXing через useEffect
  const handleStartCamera = useCallback(() => {
    setCameraError(null);
    setCameraActive(true);
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { NotFoundException, DecodeHintType, BarcodeFormat } = await import('@zxing/library');

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current!,
          (result: { getText: () => string } | null | undefined, err: unknown) => {
            if (cancelled) return;
            if (result) {
              onScan(result.getText().trim());
              stopCamera();
            }
            // NotFoundException — штатная ситуация (кадр без кода), не логируем
            if (err && !(err instanceof NotFoundException)) {
              console.error('ZXing error:', err);
            }
          },
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError(
          msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
            ? 'Нет доступа к камере. Разрешите использование камеры в настройках браузера.'
            : 'Камера недоступна. Введите штрихкод вручную.',
        );
        setCameraActive(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraActive, onScan, stopCamera]);

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualBarcode('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Видео-поток камеры */}
      <div className={`relative rounded-2xl overflow-hidden bg-black ${cameraActive ? 'block' : 'hidden'}`}>
        <video
          ref={videoRef}
          className="w-full"
          playsInline
          muted
          autoPlay
        />
        {/* Рамка прицела */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-28 border-2 border-emerald-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
        </div>
        <button
          onClick={stopCamera}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-slate-300 hover:text-white"
          aria-label="Закрыть камеру"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 text-center py-2">
          Наведите штрихкод в рамку
        </p>
      </div>

      {/* Ошибка камеры */}
      {cameraError && (
        <p className="text-xs text-amber-400 px-1">{cameraError}</p>
      )}

      {/* Кнопка запуска */}
      {!cameraActive && (
        <Button
          onClick={handleStartCamera}
          variant="outline"
          className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
          disabled={isLoading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Сканировать штрихкод
        </Button>
      )}

      {/* Разделитель */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="text-xs text-slate-500">или введите вручную</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

      {/* Ручной ввод */}
      <div className="flex gap-2">
        <Input
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          placeholder="Штрихкод (EAN-13, UPC-A...)"
          inputMode="numeric"
          pattern="[0-9]*"
          className="bg-slate-900/50 border-slate-700/50 rounded-xl text-white placeholder:text-slate-500"
          disabled={isLoading}
        />
        <Button
          onClick={handleManualSubmit}
          disabled={!manualBarcode.trim() || isLoading}
          className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-3"
          aria-label="Найти по штрихкоду"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
