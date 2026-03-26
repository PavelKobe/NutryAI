'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'nutriai_onboarding_v1';
const SHOW_DELAY_MS = 3200;

const STEPS = [
  {
    id: 'welcome',
    badge: 'Добро пожаловать 👋',
    title: 'Твой умный\nИИ-нутрициолог',
    titleAccent: 'уже здесь',
    desc: 'NutriAI анализирует питание по фото, строит персональный план и отвечает на вопросы о здоровье — 24 часа в сутки.',
    visual: (
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        {/* Orbiting food emojis */}
        {[
          { emoji: '🍲', angle: 0, r: 62 },
          { emoji: '🥗', angle: 72, r: 62 },
          { emoji: '🍗', angle: 144, r: 62 },
          { emoji: '🐟', angle: 216, r: 62 },
          { emoji: '🥚', angle: 288, r: 62 },
        ].map(({ emoji, angle, r }) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <div
              key={angle}
              className="absolute text-2xl"
              style={{
                left: `calc(50% + ${Math.cos(rad) * r}px - 16px)`,
                top: `calc(50% + ${Math.sin(rad) * r}px - 16px)`,
                animation: `orbitFloat 6s ease-in-out ${angle * 0.01}s infinite alternate`,
              }}
            >
              {emoji}
            </div>
          );
        })}
        {/* Center ring */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, rgba(0,230,118,0.15), rgba(29,233,182,0.1))',
            border: '2px solid rgba(0,230,118,0.35)',
            boxShadow: '0 0 30px rgba(0,230,118,0.25)',
          }}
        >
          <span style={{ fontSize: 32 }}>🤖</span>
        </div>
      </div>
    ),
  },
  {
    id: 'features',
    badge: 'Шаг 2 из 3 · Функции',
    title: 'Три суперсилы',
    titleAccent: 'приложения',
    desc: '',
    visual: null,
  },
  {
    id: 'cta',
    badge: 'Шаг 3 из 3 · Начало',
    title: 'Первые 10 дней',
    titleAccent: 'абсолютно бесплатно',
    desc: 'Без кредитной карты, без скрытых платежей. Просто войди и начни следить за питанием прямо сейчас.',
    visual: (
      <div className="flex items-center justify-center gap-4 flex-wrap py-2">
        {[
          { val: '85%+', label: 'Точность ИИ' },
          { val: '10к+', label: 'Пользователей' },
          { val: '4.9★', label: 'Рейтинг' },
        ].map(({ val, label }) => (
          <div
            key={label}
            className="flex flex-col items-center px-5 py-3 rounded-2xl"
            style={{
              background: 'rgba(0,230,118,0.07)',
              border: '1px solid rgba(0,230,118,0.18)',
              minWidth: 80,
            }}
          >
            <span
              className="font-black text-xl"
              style={{ color: '#00e676', fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              {val}
            </span>
            <span className="text-gray-500 text-xs mt-0.5">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

const FEATURES = [
  {
    icon: 'ri-camera-lens-line',
    color: '#00e676',
    bg: 'rgba(0,230,118,0.1)',
    title: 'Фото → КБЖУ за 3 сек',
    desc: 'Сфотографируй тарелку — ИИ сразу выдаст калории и БЖУ',
  },
  {
    icon: 'ri-robot-2-line',
    color: '#1de9b6',
    bg: 'rgba(29,233,182,0.1)',
    title: 'ИИ-нутрициолог 24/7',
    desc: 'Спрашивай что угодно о питании — получи персональный ответ',
  },
  {
    icon: 'ri-calendar-check-line',
    color: '#69f0ae',
    bg: 'rgba(105,240,174,0.1)',
    title: 'План питания на неделю',
    desc: 'Автоматически под твои цели, бюджет и вкусовые предпочтения',
  },
];

export default function OnboardingPopup() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [contentKey, setContentKey] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen) return;
    const timer = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => setMounted(false), 400);
  }, []);

  const goStep = useCallback((next: number) => {
    setAnimDir(next > step ? 'forward' : 'back');
    setContentKey((k) => k + 1);
    setStep(next);
  }, [step]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) goStep(step + 1);
    else {
      close();
      router.push('/register');
    }
  }, [step, goStep, close, router]);

  if (!mounted) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          cursor: 'pointer',
        }}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex items-center justify-center inset-0 pointer-events-none px-4"
      >
        <div
          className="relative w-full pointer-events-auto overflow-hidden"
          style={{
            maxWidth: 500,
            background: 'linear-gradient(160deg, #0a1a0a 0%, #081410 50%, #0d0f0d 100%)',
            border: '1px solid rgba(0,230,118,0.2)',
            borderRadius: 24,
            boxShadow: '0 0 80px rgba(0,230,118,0.15), 0 40px 80px rgba(0,0,0,0.8)',
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow bar */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-px pointer-events-none"
            style={{
              width: '70%',
              background: 'linear-gradient(90deg, transparent, rgba(0,230,118,0.7), transparent)',
            }}
          />

          {/* BG grid */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,230,118,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.025) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 hover:scale-110 z-10"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#666',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#fff';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,82,82,0.15)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,82,82,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#666';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <i className="ri-close-line text-sm" />
          </button>

          {/* Progress dots */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goStep(i)}
                className="rounded-full cursor-pointer transition-all duration-400"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? '#00e676' : 'rgba(255,255,255,0.15)',
                  boxShadow: i === step ? '0 0 8px rgba(0,230,118,0.6)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Animated content area */}
          <div
            key={contentKey}
            className="relative z-10 px-8 pt-14 pb-8"
            style={{
              animation: `popupStepIn${animDir === 'forward' ? 'R' : 'L'} 0.38s cubic-bezier(0.34,1.2,0.64,1)`,
            }}
          >
            {/* Badge */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{
                background: 'rgba(0,230,118,0.1)',
                border: '1px solid rgba(0,230,118,0.25)',
                color: '#00e676',
              }}
            >
              {current.badge}
            </span>

            {/* Title */}
            <h2
              className="font-black text-white leading-tight mb-1"
              style={{
                fontSize: 28,
                fontFamily: "var(--font-space-grotesk), sans-serif",
                whiteSpace: 'pre-line',
              }}
            >
              {current.title}{' '}
              <span style={{ color: '#00e676', textShadow: '0 0 20px rgba(0,230,118,0.5)' }}>
                {current.titleAccent}
              </span>
            </h2>

            {/* Visual area */}
            {current.visual && (
              <div className="my-5">{current.visual}</div>
            )}

            {/* Features step */}
            {current.id === 'features' && (
              <div className="flex flex-col gap-3 my-5">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      animation: `featIn 0.4s ease ${i * 80}ms both`,
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ background: f.bg, color: f.color }}
                    >
                      <i className={`${f.icon} text-lg`} />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{f.title}</div>
                      <div className="text-gray-500 text-xs mt-0.5 leading-snug">{f.desc}</div>
                    </div>
                    <div
                      className="ml-auto w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ background: 'rgba(0,230,118,0.15)', color: '#00e676' }}
                    >
                      <i className="ri-check-line text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {current.desc && (
              <p className="text-gray-400 text-sm leading-relaxed mb-5">{current.desc}</p>
            )}

            {/* Action row */}
            <div className="flex items-center gap-3 mt-2">
              {step > 0 && (
                <button
                  onClick={() => goStep(step - 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 hover:scale-110 flex-shrink-0"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#666',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#666';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  <i className="ri-arrow-left-line text-sm" />
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-black cursor-pointer whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #00e676, #1de9b6)',
                  boxShadow: '0 4px 24px rgba(0,230,118,0.35)',
                }}
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Далее
                    <i className="ri-arrow-right-line" />
                  </>
                ) : (
                  <>
                    <i className="ri-rocket-line" />
                    Попробовать бесплатно
                  </>
                )}
              </button>
            </div>

            {/* Skip link */}
            {step < STEPS.length - 1 && (
              <div className="text-center mt-3">
                <button
                  onClick={close}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
                >
                  Пропустить
                </button>
              </div>
            )}
          </div>

          {/* Bottom trust bar */}
          <div
            className="flex items-center justify-center gap-5 px-8 py-3 border-t text-xs text-gray-600"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {[
              { icon: 'ri-shield-check-line', text: 'Безопасно' },
              { icon: 'ri-lock-line', text: 'Без карты' },
              { icon: 'ri-global-line', text: 'Русский язык' },
            ].map((b) => (
              <span key={b.text} className="flex items-center gap-1">
                <i className={`${b.icon} text-emerald-600`} />
                {b.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popupStepInR {
          from { opacity: 0; transform: translateX(28px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes popupStepInL {
          from { opacity: 0; transform: translateX(-28px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes orbitFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-8px) scale(1.1); }
        }
        @keyframes featIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
