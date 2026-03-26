import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: 'ri-camera-lens-line',
    title: 'Распознавание еды по фото',
    desc: 'Сфотографируйте блюдо — ИИ определит состав и КБЖУ за 3 секунды с точностью 85%+',
    gradient: 'from-emerald-500 to-teal-400',
    glow: 'rgba(0,230,118,0.3)',
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Персональный план питания',
    desc: 'ИИ составит план на неделю с учётом ваших целей, бюджета и предпочтений',
    gradient: 'from-teal-500 to-cyan-400',
    glow: 'rgba(29,233,182,0.3)',
  },
  {
    icon: 'ri-robot-2-line',
    title: 'ИИ-нутрициолог 24/7',
    desc: 'Задайте любой вопрос о питании — получите персональный ответ в любое время',
    gradient: 'from-cyan-500 to-blue-400',
    glow: 'rgba(0,188,212,0.3)',
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Аналитика и прогресс',
    desc: 'Отслеживайте калории, БЖУ и вес с наглядными графиками и динамикой',
    gradient: 'from-emerald-400 to-green-500',
    glow: 'rgba(105,240,174,0.3)',
  },
  {
    icon: 'ri-restaurant-2-line',
    title: 'Генерация рецептов',
    desc: 'ИИ создаст рецепты под ваш бюджет и доступные продукты с пошаговыми инструкциями',
    gradient: 'from-green-500 to-emerald-400',
    glow: 'rgba(0,230,118,0.3)',
  },
  {
    icon: 'ri-book-open-line',
    title: 'Умный дневник питания',
    desc: 'Добавляйте еду по фото или вручную — всё автоматически считается и сохраняется',
    gradient: 'from-teal-400 to-emerald-500',
    glow: 'rgba(29,233,182,0.3)',
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl p-6 cursor-pointer group overflow-hidden"
      style={{
        background: hovered
          ? 'rgba(0,230,118,0.08)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: visible
          ? hovered
            ? 'translateY(-8px) scale(1.01)'
            : 'translateY(0) scale(1)'
          : 'translateY(40px)',
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${index * 80}ms` : '0ms',
        boxShadow: hovered ? `0 20px 60px ${feature.glow}` : 'none',
        perspective: '1000px',
      }}
    >
      {/* Glow top-left */}
      {hovered && (
        <div
          className="absolute -top-4 -left-4 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${feature.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${feature.gradient}`}
        style={{
          transform: hovered ? 'rotateY(360deg) scale(1.1)' : 'rotateY(0deg) scale(1)',
          transition: 'transform 0.6s ease',
          boxShadow: hovered ? `0 0 20px ${feature.glow}` : 'none',
        }}
      >
        <i className={`${feature.icon} text-xl text-black`} />
      </div>

      <h3
        className="text-white font-bold text-lg mb-2 transition-colors duration-300"
        style={{ color: hovered ? '#00e676' : '#ffffff' }}
      >
        {feature.title}
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>

      {/* Arrow */}
      <div
        className="flex items-center gap-1 mt-4 text-xs font-medium transition-all duration-300"
        style={{ color: hovered ? '#00e676' : 'transparent' }}
      >
        Узнать больше <i className="ri-arrow-right-line" />
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTitleVisible(true);
      },
      { threshold: 0.1 }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      className="relative py-24 px-6"
      style={{ background: '#060d06' }}
    >
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #050d05, transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div
          ref={titleRef}
          className="text-center mb-16"
          style={{
            transform: titleVisible ? 'translateY(0)' : 'translateY(30px)',
            opacity: titleVisible ? 1 : 0,
            transition: 'all 0.7s ease',
          }}
        >
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              background: 'rgba(0,230,118,0.1)',
              border: '1px solid rgba(0,230,118,0.3)',
              color: '#00e676',
            }}
          >
            6 ИИ-функций
          </span>
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Умное питание с{' '}
            <span
              style={{
                color: '#00e676',
                textShadow: '0 0 30px rgba(0,230,118,0.4)',
              }}
            >
              искусственным интеллектом
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Всё, что нужно для здорового питания — в одном приложении
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
