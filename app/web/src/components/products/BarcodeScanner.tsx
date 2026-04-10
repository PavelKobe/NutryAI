'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Search, X } from 'lucide-react';
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
  // Ref хранит экземпляр Html5Qrcode — он мутирует без ре-рендера
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore errors on stop
      }
    }
    scannerRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Динамический импорт — html5-qrcode обращается к window при загрузке модуля
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-scanner-viewport');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decoded) => {
          onScan(decoded.trim());
          stopCamera();
        },
        // Ошибки сканирования — не показываем юзеру (приходят на каждый кадр без кода)
        undefined,
      );
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Типичная причина: камера не разрешена или недоступна
      setCameraError(
        msg.includes('Permission') || msg.includes('permission')
          ? 'Нет доступа к камере. Разрешите использование камеры в браузере.'
          : 'Камера недоступна. Введите штрихкод вручную.',
      );
      scannerRef.current = null;
      setCameraActive(false);
    }
  }, [onScan, stopCamera]);

  // Очищаем камеру при размонтировании
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualBarcode('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Viewport для html5-qrcode — скрыт если камера выключена */}
      <div
        ref={containerRef}
        className={`relative rounded-2xl overflow-hidden bg-slate-800 ${cameraActive ? 'block' : 'hidden'}`}
      >
        <div id="barcode-scanner-viewport" className="w-full" />
        <button
          onClick={stopCamera}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-slate-300 hover:text-white"
          aria-label="Закрыть камеру"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 text-center py-2">
          Наведите камеру на штрихкод продукта
        </p>
      </div>

      {/* Ошибка камеры */}
      {cameraError && (
        <p className="text-xs text-amber-400 px-1">{cameraError}</p>
      )}

      {/* Кнопка запуска камеры */}
      {!cameraActive && (
        <Button
          onClick={startCamera}
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
