import { useEffect, useRef, useState, useCallback } from 'react';

interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  weight: string;
  color: string;
}

const FOODS: FoodItem[] = [
  { id: 'borscht', name: 'Борщ', emoji: '🍲', kcal: 285, protein: 14, fat: 12, carbs: 28, weight: '350 г', color: '#e53935' },
  { id: 'chicken', name: 'Куриная грудка', emoji: '🍗', kcal: 165, protein: 31, fat: 3.5, carbs: 0, weight: '150 г', color: '#fb8c00' },
  { id: 'salad', name: 'Греческий салат', emoji: '🥗', kcal: 172, protein: 5, fat: 14, carbs: 8, weight: '200 г', color: '#43a047' },
  { id: 'buckwheat', name: 'Гречка', emoji: '🌾', kcal: 310, protein: 11, fat: 3, carbs: 58, weight: '200 г', color: '#8d6e63' },
  { id: 'apple', name: 'Яблоко', emoji: '🍎', kcal: 82, protein: 0.4, fat: 0.4, carbs: 21, weight: '180 г', color: '#e53935' },
  { id: 'eggs', name: 'Яйца варёные', emoji: '🥚', kcal: 155, protein: 13, fat: 11, carbs: 1, weight: '2 шт.', color: '#fdd835' },
  { id: 'oatmeal', name: 'Овсяная каша', emoji: '🥣', kcal: 220, protein: 8, fat: 4, carbs: 38, weight: '250 г', color: '#a1887f' },
  { id: 'salmon', name: 'Лосось на гриле', emoji: '🐟', kcal: 247, protein: 27, fat: 15, carbs: 0, weight: '150 г', color: '#ef5350' },
];

const MAX_KCAL = 2200;

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = startRef.current;
    const diff = value - start;
    startTimeRef.current = null;

    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = value;
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <>{display}</>;
}

function MacroBar({ label, value, max, color, unit = 'г' }: {
  label: string; value: number; max: number; color: string; unit?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

interface ScannedItem extends FoodItem {
  uid: string;
}

type FoodScanDemoSectionProps = { onAuthStart: () => void | Promise<void> };

export default function FoodScanDemoSection({ onAuthStart }: FoodScanDemoSectionProps) {
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanningItem, setScanningItem] = useState<FoodItem | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  const totalKcal = scanned.reduce((s, i) => s + i.kcal, 0);
  const totalProtein = scanned.reduce((s, i) => s + i.protein, 0);
  const totalFat = scanned.reduce((s, i) => s + i.fat, 0);
  const totalCarbs = scanned.reduce((s, i) => s + i.carbs, 0);
  const kcalPct = Math.min((totalKcal / MAX_KCAL) * 100, 100);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScan = useCallback((food: FoodItem) => {
    if (scanning) return;
    setScanning(food.id);
    setScanningItem(food);
    setTimeout(() => {
      setScanned((prev) => [...prev, { ...food, uid: `${food.id}-${Date.now()}` }]);
      setLastAdded(food.id);
      setScanning(null);
      setTimeout(() => setLastAdded(null), 1200);
    }, 1400);
  }, [scanning]);

  const handleRemove = useCallback((uid: string) => {
    setScanned((prev) => prev.filter((i) => i.uid !== uid));
  }, []);

  const handleReset = useCallback(() => {
    setScanned([]);
  }, []);

  // Ring
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (kcalPct / 100) * circ;

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #060d06 0%, #070f0a 100%)' }}
    >
      {/* bg grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,230,118,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 65%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Title */}
        <div
          className="text-center mb-16"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.7s ease',
          }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5"
            style={{
              background: 'rgba(0,230,118,0.1)',
              border: '1px solid rgba(0,230,118,0.3)',
              color: '#00e676',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s infinite' }} />
            Живое демо — попробуй прямо сейчас
          </span>
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Сканируй еду —{' '}
            <span style={{ color: '#00e676', textShadow: '0 0 30px rgba(0,230,118,0.5)' }}>
              получай КБЖУ
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Нажми на любое блюдо — ИИ мгновенно распознает его и добавит в дневник
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* LEFT: food grid */}
          <div
            style={{
              transform: visible ? 'translateX(0)' : 'translateX(-40px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.8s ease 0.2s',
            }}
          >
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
              <i className="ri-tap-line text-emerald-500" />
              Нажми на блюдо для сканирования
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FOODS.map((food) => {
                const isScanning = scanning === food.id;
                const isAdded = lastAdded === food.id;
                return (
                  <button
                    key={food.id}
                    onClick={() => handleScan(food)}
                    disabled={!!scanning}
                    className="relative rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 select-none whitespace-nowrap overflow-hidden group"
                    style={{
                      background: isScanning
                        ? `${food.color}18`
                        : isAdded
                          ? 'rgba(0,230,118,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isScanning ? food.color + '60' : isAdded ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      transform: isScanning ? 'scale(0.97)' : isAdded ? 'scale(1.04)' : 'scale(1)',
                      boxShadow: isAdded ? '0 0 20px rgba(0,230,118,0.3)' : 'none',
                    }}
                  >
                    {/* Scan line animation */}
                    {isScanning && (
                      <div
                        className="absolute left-0 right-0 h-px pointer-events-none"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${food.color}, transparent)`,
                          animation: 'scanLine 1.4s ease-in-out',
                          top: '0%',
                        }}
                      />
                    )}
                    {/* Corner brackets when scanning */}
                    {isScanning && (
                      <>
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 rounded-tl" style={{ borderColor: food.color }} />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 rounded-tr" style={{ borderColor: food.color }} />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 rounded-bl" style={{ borderColor: food.color }} />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 rounded-br" style={{ borderColor: food.color }} />
                      </>
                    )}
                    {/* Success checkmark */}
                    {isAdded && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#00e676', animation: 'popIn 0.3s ease' }}
                      >
                        <i className="ri-check-line text-black text-xs" />
                      </div>
                    )}
                    <div className="text-3xl mb-2">{food.emoji}</div>
                    <div className="text-white text-xs font-semibold leading-tight">{food.name}</div>
                    <div className="text-gray-500 text-xs mt-1">{food.weight}</div>
                    <div
                      className="text-xs font-bold mt-1.5"
                      style={{ color: isScanning ? food.color : '#00e676' }}
                    >
                      {food.kcal} ккал
                    </div>
                    {/* Hover shimmer */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at center, ${food.color}10 0%, transparent 70%)`,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Scanning indicator */}
            <div
              className="mt-5 h-10 flex items-center"
              style={{ opacity: scanning ? 1 : 0, transition: 'opacity 0.3s' }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(0,230,118,0.08)',
                  border: '1px solid rgba(0,230,118,0.2)',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: '#00e676',
                    animation: 'ripple 1s ease infinite',
                  }}
                />
                <span className="text-emerald-400 font-medium">
                  ИИ анализирует: {scanningItem?.name}…
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-emerald-400"
                      style={{ animation: `dotBounce 1s ease ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Phone / tracker */}
          <div
            className="flex flex-col gap-5"
            style={{
              transform: visible ? 'translateX(0)' : 'translateX(40px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.8s ease 0.35s',
            }}
          >
            {/* Calorie ring + total */}
            <div
              className="rounded-2xl p-6 flex items-center gap-6"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* SVG Ring */}
              <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
                <svg width="128" height="128" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle
                    cx="64" cy="64" r={r}
                    fill="none"
                    stroke="url(#kcalGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={`${circ - dash}`}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
                  />
                  <defs>
                    <linearGradient id="kcalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00e676" />
                      <stop offset="100%" stopColor="#1de9b6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className="text-2xl font-black"
                    style={{
                      color: kcalPct > 90 ? '#ff5252' : '#00e676',
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: 'color 0.5s',
                    }}
                  >
                    <AnimatedNumber value={totalKcal} />
                  </div>
                  <div className="text-gray-500 text-xs">ккал</div>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Дневник питания
                </div>
                <div className="text-gray-500 text-sm mb-3">
                  Цель: {MAX_KCAL} ккал / день
                </div>
                <div className="text-sm" style={{ color: kcalPct > 90 ? '#ff5252' : '#00e676' }}>
                  {kcalPct > 90
                    ? `⚠️ Норма почти исчерпана`
                    : `${Math.round(MAX_KCAL - totalKcal)} ккал осталось`}
                </div>

                {/* Macros bars */}
                <div className="mt-4">
                  <MacroBar label="Белки" value={totalProtein} max={120} color="#00e676" />
                  <MacroBar label="Жиры" value={totalFat} max={80} color="#1de9b6" />
                  <MacroBar label="Углеводы" value={totalCarbs} max={250} color="#69f0ae" />
                </div>
              </div>
            </div>

            {/* Scanned items list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white font-semibold text-sm">Добавленные блюда</span>
                {scanned.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-delete-bin-line" /> Очистить
                  </button>
                )}
              </div>

              <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                {scanned.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-600 text-sm">
                    <div className="text-3xl mb-2 opacity-40">🍽️</div>
                    Нажми на блюда слева, чтобы добавить их сюда
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    {scanned.map((item, idx) => (
                      <div
                        key={item.uid}
                        className="flex items-center gap-3 px-5 py-3 group"
                        style={{
                          borderBottom: idx < scanned.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          animation: 'slideInRight 0.3s ease',
                        }}
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{item.name}</div>
                          <div className="text-gray-600 text-xs">{item.weight}</div>
                        </div>
                        <div className="text-right mr-2">
                          <div className="text-emerald-400 text-sm font-bold">{item.kcal} ккал</div>
                          <div className="text-gray-600 text-xs">
                            Б{Math.round(item.protein)} Ж{Math.round(item.fat)} У{Math.round(item.carbs)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(item.uid)}
                          className="w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ background: 'rgba(255,82,82,0.15)', color: '#ff5252' }}
                        >
                          <i className="ri-close-line text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom macro summary row */}
              {scanned.length > 0 && (
                <div
                  className="grid grid-cols-4 text-center px-4 py-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,230,118,0.04)' }}
                >
                  {[
                    { label: 'Итого', val: `${totalKcal}`, unit: 'ккал', color: '#00e676' },
                    { label: 'Белки', val: `${Math.round(totalProtein)}`, unit: 'г', color: '#1de9b6' },
                    { label: 'Жиры', val: `${Math.round(totalFat)}`, unit: 'г', color: '#69f0ae' },
                    { label: 'Углеводы', val: `${Math.round(totalCarbs)}`, unit: 'г', color: '#b9f6ca' },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="text-xs text-gray-600">{m.label}</div>
                      <div className="font-bold text-sm" style={{ color: m.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {m.val}
                        <span className="text-xs font-normal text-gray-600"> {m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(0,230,118,0.1), rgba(29,233,182,0.07))',
                border: '1px solid rgba(0,230,118,0.2)',
              }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'rgba(0,230,118,0.15)' }}>
                <i className="ri-smartphone-line text-emerald-400 text-lg" />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">Попробуй в реальном приложении</div>
                <div className="text-gray-500 text-xs mt-0.5">Сканируй фото, получай точный КБЖУ с ИИ</div>
              </div>
              <button
                type="button"
                onClick={() => void onAuthStart()}
                className="px-4 py-2 rounded-xl text-black text-xs font-bold whitespace-nowrap cursor-pointer transition-transform duration-200 hover:scale-105 flex-shrink-0 border-0"
                style={{ background: 'linear-gradient(135deg, #00e676, #1de9b6)' }}
              >
                Открыть
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 1; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0,230,118,0.6); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 10px rgba(0,230,118,0); }
        }
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
