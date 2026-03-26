import { useEffect, useRef, useState } from 'react';

const freeFeatures = [
  { text: 'Дневник питания (до 10 записей/день)', included: true },
  { text: 'Распознавание еды по фото (5 раз/день)', included: true },
  { text: 'База данных 500K+ блюд', included: true },
  { text: 'Базовая аналитика КБЖУ', included: true },
  { text: 'ИИ-чат (10 сообщений/день)', included: true },
  { text: 'Персональный план питания', included: false },
  { text: 'Безлимитное распознавание фото', included: false },
  { text: 'Расширенная аналитика и отчёты', included: false },
  { text: 'Генерация рецептов по ИИ', included: false },
  { text: 'Приоритетная поддержка', included: false },
];

const premiumFeatures = [
  { text: 'Безлимитный дневник питания', included: true },
  { text: 'Безлимитное распознавание по фото', included: true },
  { text: 'База данных 2M+ блюд', included: true },
  { text: 'Расширенная аналитика и экспорт PDF', included: true },
  { text: 'Безлимитный ИИ-чат', included: true },
  { text: 'Персональный план питания', included: true },
  { text: 'Генерация рецептов под цели', included: true },
  { text: 'Трекинг воды и микронутриентов', included: true },
  { text: 'Интеграция с Apple Health / Google Fit', included: true },
  { text: 'Приоритетная поддержка 24/7', included: true },
];

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 3,
}));

function PremiumParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(0,230,118,0.6)',
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
            boxShadow: '0 0 6px rgba(0,230,118,0.8)',
          }}
        />
      ))}
    </div>
  );
}

type PricingSectionProps = { onAuthStart: () => void | Promise<void> };

export default function PricingSection({ onAuthStart }: PricingSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<'free' | 'premium' | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const monthlyPrice = 299;
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.6);
  const yearlyPerMonth = Math.round(yearlyPrice / 12);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative w-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #060d06 0%, #050d05 100%)',
        padding: '120px 0 140px',
      }}
    >
      {/* Background effects */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,230,118,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.025) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(0,230,118,0.07) 0%, transparent 65%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div
          className="text-center mb-16"
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
            <i className="ri-price-tag-3-fill text-sm" />
            Тарифы
          </div>
          <h2
            className="text-4xl md:text-6xl font-black mb-5 tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Начни бесплатно,{' '}
            <span style={{ color: '#00e676', textShadow: '0 0 30px rgba(0,230,118,0.5)' }}>
              раскрой максимум
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            Базовые функции всегда бесплатны. Premium открывает безлимит и полную мощь ИИ.
          </p>

          {/* Billing toggle */}
          <div
            className="inline-flex items-center gap-4 mt-10 p-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setIsYearly(false)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap"
              style={{
                background: !isYearly ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: !isYearly ? '#ffffff' : '#6b7280',
                border: 'none',
              }}
            >
              Ежемесячно
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap"
              style={{
                background: isYearly ? 'linear-gradient(135deg, #00e676, #1de9b6)' : 'transparent',
                color: isYearly ? '#000000' : '#6b7280',
                border: 'none',
              }}
            >
              Ежегодно
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: isYearly ? 'rgba(0,0,0,0.2)' : 'rgba(0,230,118,0.15)',
                  color: isYearly ? '#000' : '#00e676',
                }}
              >
                −40%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center">

          {/* Free Card */}
          <div
            onMouseEnter={() => setHoveredCard('free')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative rounded-3xl p-8 flex flex-col w-full lg:max-w-sm cursor-pointer"
            style={{
              background: hoveredCard === 'free'
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hoveredCard === 'free' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? hoveredCard === 'free' ? 'translateY(-6px)' : 'translateY(0)'
                : 'translateY(60px)',
              transition: 'all 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
              transitionDelay: isVisible ? '0.1s' : '0s',
            }}
          >
            {/* Plan header */}
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <i className="ri-gift-line" />
                Бесплатно
              </div>
              <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Free
              </h3>
              <p className="text-gray-500 text-sm">Попробуй без риска. Без карты.</p>
            </div>

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  0 ₽
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">навсегда бесплатно</p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => void onAuthStart()}
              className="w-full block text-center py-3.5 rounded-xl text-sm font-semibold mb-8 cursor-pointer whitespace-nowrap transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
              }}
            >
              Начать бесплатно
            </button>

            {/* Divider */}
            <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* Features */}
            <ul className="flex flex-col gap-3 flex-1">
              {freeFeatures.map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                    style={{
                      background: f.included ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <i
                      className={f.included ? 'ri-check-line text-xs' : 'ri-close-line text-xs'}
                      style={{ color: f.included ? '#00e676' : '#4b5563' }}
                    />
                  </div>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: f.included ? '#d1d5db' : '#4b5563' }}
                  >
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium Card */}
          <div
            onMouseEnter={() => setHoveredCard('premium')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative rounded-3xl p-8 flex flex-col w-full lg:max-w-sm cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(0,30,15,0.95) 0%, rgba(0,20,10,0.98) 100%)',
              border: `1px solid ${hoveredCard === 'premium' ? 'rgba(0,230,118,0.6)' : 'rgba(0,230,118,0.3)'}`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? hoveredCard === 'premium' ? 'translateY(-10px) scale(1.01)' : 'translateY(-4px)'
                : 'translateY(60px)',
              transition: 'all 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
              transitionDelay: isVisible ? '0.2s' : '0s',
              boxShadow: hoveredCard === 'premium'
                ? '0 30px 80px rgba(0,230,118,0.2), 0 0 0 1px rgba(0,230,118,0.1)'
                : '0 20px 60px rgba(0,230,118,0.12)',
            }}
          >
            <PremiumParticles />

            {/* Corner glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-80px',
                right: '-80px',
                width: '250px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(0,230,118,0.15) 0%, transparent 65%)',
              }}
            />

            {/* Popular badge */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #00e676, #1de9b6)',
                color: '#000000',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="ri-sparkling-2-fill text-xs" />
              Популярный выбор
            </div>

            {/* Plan header */}
            <div className="mb-8 mt-3">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)' }}
              >
                <i className="ri-vip-crown-fill" />
                Premium
              </div>
              <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Premium
              </h3>
              <p className="text-gray-400 text-sm">Полная мощь ИИ без ограничений.</p>
            </div>

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span
                  className="text-6xl font-black"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: '#00e676',
                    textShadow: '0 0 30px rgba(0,230,118,0.4)',
                    transition: 'all 0.4s ease',
                  }}
                >
                  {isYearly ? yearlyPerMonth : monthlyPrice} ₽
                </span>
                <span className="text-gray-500 text-sm mb-3">/мес</span>
              </div>
              {isYearly ? (
                <p className="text-sm" style={{ color: '#00e676' }}>
                  {yearlyPrice} ₽/год · Экономия {monthlyPrice * 12 - yearlyPrice} ₽
                </p>
              ) : (
                <p className="text-gray-600 text-sm">
                  или{' '}
                  <button
                    onClick={() => setIsYearly(true)}
                    className="cursor-pointer underline transition-colors"
                    style={{ color: '#00e676', background: 'none', border: 'none', padding: 0 }}
                  >
                    {yearlyPerMonth} ₽/мес при оплате за год
                  </button>
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => void onAuthStart()}
              className="relative w-full block text-center py-3.5 rounded-xl text-sm font-bold mb-8 cursor-pointer whitespace-nowrap overflow-hidden group transition-all duration-200 hover:scale-105 border-0"
              style={{
                background: 'linear-gradient(135deg, #00e676, #1de9b6)',
                color: '#000000',
                boxShadow: '0 0 30px rgba(0,230,118,0.35)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Попробовать Premium
                <i className="ri-arrow-right-line" />
              </span>
              {/* Shine sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                  transform: 'translateX(-100%)',
                  animation: 'shineSweep 3s ease-in-out 1s infinite',
                }}
              />
            </button>

            {/* Divider */}
            <div className="h-px mb-6" style={{ background: 'rgba(0,230,118,0.15)' }} />

            {/* Features */}
            <ul className="flex flex-col gap-3 flex-1">
              {premiumFeatures.map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(0,230,118,0.15)' }}
                  >
                    <i className="ri-check-line text-xs" style={{ color: '#00e676' }} />
                  </div>
                  <span className="text-sm text-gray-300 leading-relaxed">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise teaser card */}
          <div
            onMouseEnter={() => setHoveredCard('free')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative rounded-3xl p-8 flex flex-col w-full lg:max-w-xs cursor-pointer justify-between"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
              transition: 'all 0.5s ease',
              transitionDelay: isVisible ? '0.35s' : '0s',
            }}
          >
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: 'rgba(255,214,0,0.1)', color: '#ffd600', border: '1px solid rgba(255,214,0,0.15)' }}
              >
                <i className="ri-building-2-fill" />
                Enterprise
              </div>
              <h3 className="text-2xl font-black text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Для бизнеса
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Корпоративные решения для клиник, фитнес-центров и диетологов. Брендинг, API, аналитика команды.
              </p>

              <ul className="flex flex-col gap-2.5 mb-8">
                {[
                  'Белый лейбл / брендинг',
                  'API доступ',
                  'Аналитика по клиентам',
                  'До 1000 пользователей',
                  'Персональный менеджер',
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <i className="ri-check-line text-xs" style={{ color: '#ffd600' }} />
                    <span className="text-sm text-gray-400">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-3xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                По запросу
              </div>
              <p className="text-gray-600 text-xs mb-5">индивидуальные условия</p>
              <button
                type="button"
                onClick={() => void onAuthStart()}
                className="w-full block text-center py-3 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(255,214,0,0.08)',
                  border: '1px solid rgba(255,214,0,0.2)',
                  color: '#ffd600',
                }}
              >
                Связаться с нами
              </button>
            </div>
          </div>
        </div>

        {/* Bottom trust row */}
        <div
          className="flex flex-wrap justify-center gap-8 mt-16 text-sm text-gray-600"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.6s',
          }}
        >
          {[
            { icon: 'ri-shield-check-line', text: 'Безопасная оплата' },
            { icon: 'ri-loop-left-line', text: 'Отмена в любой момент' },
            { icon: 'ri-bank-card-line', text: 'Без скрытых платежей' },
            { icon: 'ri-customer-service-2-line', text: 'Поддержка 24/7' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <i className={`${item.icon} text-base`} style={{ color: '#00e676' }} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 1; }
        }
        @keyframes shineSweep {
          0% { transform: translateX(-100%); }
          40%, 100% { transform: translateX(200%); }
        }
      `}</style>
    </section>
  );
}
