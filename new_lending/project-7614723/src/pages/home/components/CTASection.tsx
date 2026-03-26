import { useEffect, useRef, useState, useMemo } from 'react';

function ScatterText({ text, visible, delay = 0 }: { text: string; visible: boolean; delay?: number }) {
  const chars = useMemo(() => text.split(''), [text]);

  return (
    <span className="inline-flex flex-wrap justify-center">
      {chars.map((char, i) => {
        const angle = Math.random() * 360;
        const dist = 80 + Math.random() * 120;
        const rx = Math.cos((angle * Math.PI) / 180) * dist;
        const ry = Math.sin((angle * Math.PI) / 180) * dist;
        const rot = (Math.random() - 0.5) * 90;
        const charDelay = delay + i * 0.03;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: visible ? 'translate(0,0) rotate(0deg)' : `translate(${rx}px,${ry}px) rotate(${rot}deg)`,
              opacity: visible ? 1 : 0,
              transition: `transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${charDelay}s, opacity 0.5s ease ${charDelay}s`,
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
}

export default function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="relative py-28 px-6 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #070d10 0%, #050d05 100%)',
        isolation: 'isolate',
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,230,118,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Floating feature cards — contained properly */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { left: '3%', top: '15%', deg: '-12deg', delay: '0s', icon: 'ri-camera-lens-line', label: 'Фото → КБЖУ' },
          { right: '3%', top: '12%', deg: '10deg', delay: '0.5s', icon: 'ri-robot-2-line', label: 'ИИ-советник' },
          { left: '4%', bottom: '18%', deg: '7deg', delay: '0.3s', icon: 'ri-heart-pulse-line', label: 'Прогресс' },
          { right: '4%', bottom: '20%', deg: '-9deg', delay: '0.7s', icon: 'ri-restaurant-2-line', label: 'Рецепты' },
        ].map((card, i) => (
          <div
            key={i}
            className="absolute hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              top: card.top,
              bottom: card.bottom,
              left: card.left,
              right: card.right,
              transform: `rotate(${card.deg})`,
              background: 'rgba(0,230,118,0.07)',
              border: '1px solid rgba(0,230,118,0.18)',
              color: '#00e676',
              animation: `floatCard 5s ease-in-out infinite alternate`,
              animationDelay: card.delay,
              opacity: visible ? 1 : 0,
              transition: `opacity 0.8s ease ${i * 0.2}s`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <i className={card.icon} />
            {card.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <span
          className="inline-block px-4 py-1 rounded-full text-xs font-medium mb-6"
          style={{
            background: 'rgba(0,230,118,0.1)',
            border: '1px solid rgba(0,230,118,0.3)',
            color: '#00e676',
            fontFamily: "'Inter', sans-serif",
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-15px)',
            transition: 'all 0.6s ease',
          }}
        >
          Бесплатная Demo-версия
        </span>

        {/* Scatter-animated heading */}
        <h2
          className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight overflow-hidden"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <ScatterText text="Начните питаться" visible={visible} delay={0.1} />
          <br />
          <span style={{ color: '#00e676', textShadow: '0 0 40px rgba(0,230,118,0.5)' }}>
            <ScatterText text="правильно" visible={visible} delay={0.4} />
          </span>
          {' '}
          <ScatterText text="уже сегодня" visible={visible} delay={0.8} />
        </h2>

        <p
          className="text-gray-400 text-lg max-w-xl mx-auto mb-10"
          style={{
            fontFamily: "'Inter', sans-serif",
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 1.2s',
          }}
        >
          Все ИИ-функции доступны без ограничений в бесплатной Demo-версии.
          Никаких скрытых платежей, никакой рекламы.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 1.4s',
          }}
        >
          <a
            href="https://nutriaidiary.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-10 py-4 rounded-full text-black font-bold text-lg cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00e676, #1de9b6)',
              boxShadow: '0 0 40px rgba(0,230,118,0.4)',
            }}
          >
            <span className="flex items-center gap-2">
              Создать аккаунт бесплатно
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </a>
          <div className="flex items-center gap-2 text-gray-500 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            <i className="ri-check-line text-emerald-500" /> Без кредитной карты
          </div>
        </div>

        {/* Feature pills */}
        <div
          className="flex flex-wrap justify-center gap-3 mt-10"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 1.6s',
          }}
        >
          {[
            'Распознавание по фото',
            'Персональный план питания',
            'ИИ-нутрициолог 24/7',
            'Дневник питания',
            'Аналитика КБЖУ',
          ].map((pill) => (
            <span
              key={pill}
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9ca3af',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatCard {
          from { transform: rotate(var(--rot, 0deg)) translateY(0px); }
          to { transform: rotate(var(--rot, 0deg)) translateY(-10px); }
        }
      `}</style>
    </section>
  );
}
