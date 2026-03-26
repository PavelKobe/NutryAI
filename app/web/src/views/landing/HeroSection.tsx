'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const ThreeScene = dynamic(() => import('./ThreeScene'), { ssr: false });

/** Пара прилагательное + существительное (род и падеж согласованы) */
const heroPhrases = [
  { adj: 'Умное', noun: 'питание' },
  { adj: 'Умное', noun: 'здоровье' },
  { adj: 'Умная', noun: 'энергия' },
  { adj: 'Умный', noun: 'баланс' },
] as const;

export default function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIdx((p) => (p + 1) % heroPhrases.length);
        setFade(true);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (sectionRef.current) {
        setOffset(window.scrollY * 0.35);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #050d05 0%, #061412 40%, #080d10 100%)',
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,230,118,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transform: `translateY(${offset * 0.2}px)`,
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-100px',
          left: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,230,118,0.12) 0%, transparent 70%)',
          transform: `translateY(${offset * 0.15}px)`,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '0px',
          right: '-50px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,233,182,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Three.js canvas */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translateY(${offset * 0.1}px)` }}
      >
        <ThreeScene />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            background: 'rgba(0,230,118,0.1)',
            border: '1px solid rgba(0,230,118,0.3)',
            color: '#00e676',
            animation: 'fadeInDown 0.8s ease forwards',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: 'pulse 2s infinite' }}
          />
          Powered by AI — Gemini Pro + GPT-5 + Claude
        </div>

        {/* Main headline */}
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-6 tracking-tight"
          style={{
            color: '#ffffff',
            animation: 'fadeInUp 0.9s ease 0.2s forwards',
            opacity: 0,
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              opacity: fade ? 1 : 0,
              transform: fade ? 'translateY(0)' : 'translateY(-10px)',
            }}
          >
            <span style={{ color: '#ffffff' }}>{heroPhrases[wordIdx].adj}</span>
            {' '}
            <span
              style={{
                color: '#00e676',
                textShadow: '0 0 40px rgba(0,230,118,0.6)',
              }}
            >
              {heroPhrases[wordIdx].noun}
            </span>
          </span>
          <br />
          <span style={{ color: '#1de9b6' }}>с ИИ-нутрициологом</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed mb-10"
          style={{
            animation: 'fadeInUp 0.9s ease 0.4s forwards',
            opacity: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Распознавание еды по фото, персональные планы питания, умный дневник и
          чат с ИИ-нутрициологом — всё в одном приложении.
          <span className="text-emerald-400"> Адаптировано для российской кухни.</span>
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 items-center"
          style={{
            animation: 'fadeInUp 0.9s ease 0.6s forwards',
            opacity: 0,
          }}
        >
          <a
            href="/register"
            className="group relative px-8 py-4 rounded-full text-black font-bold text-lg overflow-hidden cursor-pointer whitespace-nowrap transition-transform duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00e676, #1de9b6)',
              boxShadow: '0 0 30px rgba(0,230,118,0.4)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Начать бесплатно
              <i className="ri-arrow-right-line" />
            </span>
          </a>
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap group"
          >
            <span
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-emerald-400 transition-colors"
            >
              <i className="ri-play-fill text-xs ml-0.5" />
            </span>
            Узнать больше
          </a>
        </div>

        {/* Trust badges */}
        <div
          className="flex flex-wrap justify-center gap-6 mt-14 text-sm text-gray-500"
          style={{ animation: 'fadeInUp 0.9s ease 0.8s forwards', opacity: 0 }}
        >
          {[
            { icon: 'ri-check-line', text: 'Бесплатно' },
            { icon: 'ri-shield-check-line', text: 'Без рекламы' },
            { icon: 'ri-global-line', text: 'Русский язык' },
            { icon: 'ri-star-fill', text: '4.9 / 5.0' },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-1.5">
              <i className={`${badge.icon} text-emerald-500`} />
              <span>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600"
        style={{ animation: 'bounce 2s infinite' }}
      >
        <span className="text-xs tracking-widest uppercase">Листай</span>
        <i className="ri-arrow-down-line" />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}
