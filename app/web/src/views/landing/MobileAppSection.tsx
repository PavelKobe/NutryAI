'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const screenshots = [
  {
    id: 1,
    url: 'https://readdy.ai/api/search-image?query=mobile app dark theme nutrition diary food tracking dashboard with green emerald accent colors, calorie counter, meal log interface, modern minimalist UI, clean layout, deep dark background #050d05, neon green highlights, beautiful typography, glass morphism cards&width=390&height=844&seq=phone-ss-1&orientation=portrait',
    label: 'Дневник питания',
  },
  {
    id: 2,
    url: 'https://readdy.ai/api/search-image?query=mobile%20app%20dark%20theme%20AI%20food%20recognition%20camera%20scanner%20interface%20with%20emerald%20green%20highlight%20overlay%2C%20detecting%20meal%20on%20plate%2C%20nutrition%20facts%20popup%2C%20modern%20dark%20UI%2C%20deep%20black%20background%2C%20glowing%20green%20scan%20frame%2C%20clean%20minimalist%20design&width=390&height=844&seq=phone-ss-2&orientation=portrait',
    label: 'ИИ-сканирование',
  },
  {
    id: 3,
    url: 'https://readdy.ai/api/search-image?query=mobile app dark nutrition weekly progress charts graphs macros protein carbs fat analytics dashboard, emerald green teal glowing bar charts, dark background #050d05, smooth UI, beautiful data visualization screen&width=390&height=844&seq=phone-ss-3&orientation=portrait',
    label: 'Аналитика',
  },
];

const floatingCards = [
  {
    id: 'kcal',
    icon: 'ri-fire-fill',
    label: 'Ккал сегодня',
    value: '1 840',
    sub: 'из 2 200',
    color: '#ff6b35',
    position: { top: '12%', left: '-90px' },
    delay: 0,
  },
  {
    id: 'ai',
    icon: 'ri-brain-fill',
    label: 'ИИ-анализ',
    value: '98%',
    sub: 'точность',
    color: '#00e676',
    position: { top: '30%', right: '-90px' },
    delay: 0.4,
  },
  {
    id: 'water',
    icon: 'ri-drop-fill',
    label: 'Вода',
    value: '2.1 л',
    sub: 'из 2.5 л',
    color: '#1de9b6',
    position: { bottom: '30%', left: '-90px' },
    delay: 0.8,
  },
  {
    id: 'streak',
    icon: 'ri-trophy-fill',
    label: 'Стрик',
    value: '23',
    sub: 'дня подряд',
    color: '#ffd600',
    position: { bottom: '12%', right: '-90px' },
    delay: 1.2,
  },
];

export default function MobileAppSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activeScreen, setActiveScreen] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const animFrameRef = useRef<number>(0);
  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });

  // Intersection observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-rotate screenshots
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((p) => (p + 1) % screenshots.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Smooth parallax lerp
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const animateParallax = useCallback(() => {
    currentTilt.current.x = lerp(currentTilt.current.x, targetTilt.current.x, 0.08);
    currentTilt.current.y = lerp(currentTilt.current.y, targetTilt.current.y, 0.08);
    setTilt({ x: currentTilt.current.x, y: currentTilt.current.y });
    animFrameRef.current = requestAnimationFrame(animateParallax);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animateParallax);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animateParallax]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    targetTilt.current = { x: dy * 18, y: -dx * 18 };
  }, []);

  const handleMouseLeave = useCallback(() => {
    targetTilt.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const phoneTransform = `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`;

  return (
    <section
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #050d05 0%, #040f0c 50%, #050d05 100%)',
        padding: '120px 0',
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(0,230,118,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(29,233,182,0.05) 0%, transparent 50%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,230,118,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          className="text-center mb-20"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{
              background: 'rgba(0,230,118,0.1)',
              border: '1px solid rgba(0,230,118,0.25)',
              color: '#00e676',
            }}
          >
            <i className="ri-smartphone-fill text-sm" />
            Мобильное приложение
          </div>
          <h2
            className="text-4xl md:text-6xl font-black mb-5 tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Твой ИИ-нутрициолог{' '}
            <span
              style={{
                color: '#00e676',
                textShadow: '0 0 30px rgba(0,230,118,0.5)',
              }}
            >
              всегда рядом
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            Сканируй еду камерой, общайся с ИИ и отслеживай прогресс — прямо с телефона.
          </p>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-24">
          {/* Left features */}
          <div
            className="flex flex-col gap-6 w-full lg:w-auto lg:max-w-xs"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-60px)',
              transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
            }}
          >
            {[
              {
                icon: 'ri-camera-ai-fill',
                title: 'Фото-сканирование',
                desc: 'Сфотографируй блюдо — ИИ мгновенно определит состав и калории с точностью 98%',
                color: '#00e676',
              },
              {
                icon: 'ri-bar-chart-grouped-fill',
                title: 'Умная аналитика',
                desc: 'Графики БЖУ, динамика веса, недельные отчёты и персональные рекомендации',
                color: '#1de9b6',
              },
              {
                icon: 'ri-notification-3-fill',
                title: 'Умные напоминания',
                desc: 'Персонализированные уведомления — не забывай пить воду и принимать пищу вовремя',
                color: '#ff6b35',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-5 rounded-2xl cursor-pointer group transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transitionDelay: `${i * 0.1}s`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,230,118,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,230,118,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${feature.color}18`, color: feature.color }}
                >
                  <i className={`${feature.icon} text-lg`} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{feature.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 3D Phone */}
          <div
            className="relative flex-shrink-0"
            style={{ perspective: '1000px' }}
          >
            {/* Glow under phone */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '280px',
                height: '60px',
                background: 'radial-gradient(ellipse, rgba(0,230,118,0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />

            {/* Phone wrapper with 3D tilt */}
            <div
              ref={phoneRef}
              style={{
                transform: phoneTransform,
                transition: 'transform 0.05s linear',
                willChange: 'transform',
                position: 'relative',
              }}
            >
              {/* Floating cards */}
              {floatingCards.map((card) => (
                <div
                  key={card.id}
                  className="absolute flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{
                    ...card.position,
                    background: 'rgba(10,20,15,0.9)',
                    border: `1px solid ${card.color}30`,
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${card.color}15`,
                    width: '130px',
                    animation: `floatCard 4s ease-in-out ${card.delay}s infinite`,
                    zIndex: 20,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${card.color}20`, color: card.color }}
                  >
                    <i className={`${card.icon} text-sm`} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm leading-none">{card.value}</div>
                    <div className="text-gray-500 text-xs mt-0.5 leading-none">{card.sub}</div>
                  </div>
                </div>
              ))}

              {/* Phone frame */}
              <div
                style={{
                  width: '280px',
                  height: '580px',
                  borderRadius: '44px',
                  background: 'linear-gradient(145deg, #1a2a1a, #0d1a0d)',
                  border: '2px solid rgba(0,230,118,0.15)',
                  boxShadow: `
                    0 0 0 1px rgba(0,0,0,0.8),
                    inset 0 0 0 2px rgba(255,255,255,0.06),
                    0 30px 80px rgba(0,0,0,0.8),
                    0 0 60px rgba(0,230,118,0.08)
                  `,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Notch */}
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100px',
                    height: '28px',
                    background: '#050d05',
                    borderRadius: '20px',
                    zIndex: 10,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                />

                {/* Screen content */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '4px',
                    borderRadius: '40px',
                    overflow: 'hidden',
                    background: '#050d05',
                  }}
                >
                  {screenshots.map((screen, idx) => (
                    <img
                      key={screen.id}
                      src={screen.url}
                      alt={screen.label}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        opacity: idx === activeScreen ? 1 : 0,
                        transition: 'opacity 0.7s ease',
                      }}
                    />
                  ))}

                  {/* Status bar */}
                  <div
                    className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 pt-4 pb-2"
                    style={{
                      background: 'linear-gradient(180deg, rgba(5,13,5,0.9) 0%, transparent 100%)',
                      zIndex: 5,
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span className="font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <i className="ri-signal-wifi-fill text-xs" />
                      <i className="ri-signal-fill text-xs" />
                      <i className="ri-battery-fill text-xs" />
                    </div>
                  </div>

                  {/* Screen label overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 text-center pb-6 pt-10"
                    style={{
                      background: 'linear-gradient(0deg, rgba(5,13,5,0.95) 0%, transparent 100%)',
                      zIndex: 5,
                    }}
                  >
                    <span
                      className="text-xs font-medium px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(0,230,118,0.15)',
                        color: '#00e676',
                        border: '1px solid rgba(0,230,118,0.3)',
                      }}
                    >
                      {screenshots[activeScreen].label}
                    </span>
                  </div>
                </div>

                {/* Side button */}
                <div
                  style={{
                    position: 'absolute',
                    right: '-3px',
                    top: '130px',
                    width: '3px',
                    height: '60px',
                    background: 'linear-gradient(180deg, #1a2a1a, #0d1a0d)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
                {/* Volume buttons */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-3px',
                    top: '110px',
                    width: '3px',
                    height: '40px',
                    background: 'linear-gradient(180deg, #1a2a1a, #0d1a0d)',
                    borderRadius: '3px 0 0 3px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '-3px',
                    top: '165px',
                    width: '3px',
                    height: '40px',
                    background: 'linear-gradient(180deg, #1a2a1a, #0d1a0d)',
                    borderRadius: '3px 0 0 3px',
                  }}
                />

                {/* Reflection shine */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                    borderRadius: '40px 40px 0 0',
                    zIndex: 6,
                  }}
                />
              </div>
            </div>

            {/* Screen dots */}
            <div className="flex justify-center gap-2 mt-8">
              {screenshots.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveScreen(idx)}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    width: idx === activeScreen ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: idx === activeScreen ? '#00e676' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right features + app store */}
          <div
            className="flex flex-col gap-6 w-full lg:w-auto lg:max-w-xs"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(60px)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
            }}
          >
            {[
              {
                icon: 'ri-robot-fill',
                title: 'ИИ-чат 24/7',
                desc: 'Спрашивай у нутрициолога ИИ что угодно — он ответит мгновенно на русском языке',
                color: '#a78bfa',
              },
              {
                icon: 'ri-restaurant-fill',
                title: '2M+ блюд в базе',
                desc: 'Огромная база российских, советских и мировых блюд — найдёт любое, даже домашнее',
                color: '#ffd600',
              },
              {
                icon: 'ri-line-chart-fill',
                title: 'Цели и прогресс',
                desc: 'Ставь цели по весу, мышцам или здоровью — ИИ адаптирует план автоматически',
                color: '#00e676',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transitionDelay: `${i * 0.1}s`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,230,118,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,230,118,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${feature.color}18`, color: feature.color }}
                >
                  <i className={`${feature.icon} text-lg`} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{feature.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  );
}
