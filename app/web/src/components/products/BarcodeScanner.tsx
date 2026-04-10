'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isLoading?: boolean;
}

// Форматы для нативного BarcodeDetector API
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

/** Проверяет поддержку нативного BarcodeDetector (Android Chrome, Desktop Chrome) */
function isNativeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function BarcodeScanner({ onScan, isLoading }: BarcodeScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerMode, setScannerMode] = useState<'native' | 'zxing' | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const nativeRafRef = useRef<number | null>(null);
  const nativeDetectorRef = useRef<unknown>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    // Остановить нативный RAF-loop
    if (nativeRafRef.current) {
      cancelAnimationFrame(nativeRafRef.current);
      nativeRafRef.current = null;
    }
    // Остановить ZXing
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    // Остановить медиапоток
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setCameraActive(false);
    setScannerMode(null);
  }, []);

  const handleStartCamera = useCallback(() => {
    setCameraError(null);
    setCameraActive(true);
  }, []);

  // ── Запуск сканера после появления <video> в DOM ─────────────────────────
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Запрашиваем поток камеры
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();

        if (cancelled) { stopCamera(); return; }

        if (isNativeDetectorSupported()) {
          // ── Режим 1: нативный BarcodeDetector ──────────────────────────
          setScannerMode('native');
          type BarcodeDetectorType = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
          type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorType;
          const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
          const detector = new BarcodeDetectorCtor({ formats: NATIVE_FORMATS });
          nativeDetectorRef.current = detector;

          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
          }
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d')!;

          const scanFrame = async () => {
            if (cancelled) return;
            const video = videoRef.current;
            if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              try {
                const results = await detector.detect(canvas);
                if (results.length > 0) {
                  const code = results[0].rawValue?.trim();
                  if (code) { onScan(code); stopCamera(); return; }
                }
              } catch { /* нет кода в кадре — ок */ }
            }
            nativeRafRef.current = requestAnimationFrame(() => { scanFrame(); });
          };
          scanFrame();

        } else {
          // ── Режим 2: ZXing fallback (iOS Safari, Firefox) ───────────────
          setScannerMode('zxing');
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const { NotFoundException, DecodeHintType, BarcodeFormat } = await import('@zxing/library');

          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const reader = new BrowserMultiFormatReader(hints);
          const controls = await reader.decodeFromStream(
            stream,
            videoRef.current!,
            (result: { getText: () => string } | null | undefined, err: unknown) => {
              if (cancelled) return;
              if (result) { onScan(result.getText().trim()); stopCamera(); }
              if (err && !(err instanceof NotFoundException)) console.error('ZXing:', err);
            },
          );
          if (cancelled) { controls.stop(); } else { zxingControlsRef.current = controls; }
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
      if (nativeRafRef.current) { cancelAnimationFrame(nativeRafRef.current); nativeRafRef.current = null; }
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed) { onScan(trimmed); setManualBarcode(''); }
  };

  return (
    <div className="space-y-3">
      {/* Видео-поток */}
      <div className={`relative rounded-2xl overflow-hidden bg-black ${cameraActive ? 'block' : 'hidden'}`}>
        <video ref={videoRef} className="w-full" playsInline muted />

        {/* Рамка прицела */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-28 border-2 border-emerald-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>

        {/* Бейдж режима */}
        {scannerMode && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-[10px] text-slate-400">
            {scannerMode === 'native' ? '⚡ Нативный сканер' : '🔍 ZXing'}
          </div>
        )}

        <button
          onClick={stopCamera}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-slate-300 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 text-center py-2">Наведите штрихкод в рамку</p>
      </div>

      {cameraError && <p className="text-xs text-amber-400 px-1">{cameraError}</p>}

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

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="text-xs text-slate-500">или введите вручную</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

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
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
