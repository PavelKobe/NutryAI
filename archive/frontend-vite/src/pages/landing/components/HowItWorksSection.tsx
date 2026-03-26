import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    num: '01',
    icon: 'ri-camera-line',
    title: 'Сфотографируйте блюдо',
    desc: 'Откройте приложение и сфотографируйте любое блюдо. ИИ мгновенно распознаёт все ингредиенты и считает КБЖУ.',
    image: 'https://readdy.ai/api/search-image?query=person%20holding%20smartphone%20photographing%20healthy%20colorful%20meal%20bowl%20with%20salmon%20avocado%20vegetables%20on%20wooden%20table%2C%20modern%20kitchen%20interior%2C%20natural%20lighting%2C%20lifestyle%20food%20photography%2C%20clean%20aesthetic&width=480&height=360&seq=step001&orientation=landscape',
  },
  {
    num: '02',
    icon: 'ri-magic-line',
    title: 'ИИ анализирует и считает',
    desc: 'Gemini Pro анализирует фото за 3 секунды. Получите точный состав: белки, жиры, углеводы, калории и микроэлементы.',
    image: 'https://readdy.ai/api/search-image?query=futuristic%20smartphone%20screen%20showing%20nutrition%20tracking%20app%20with%20green%20data%20visualization%20charts%20calories%20proteins%20fats%20carbohydrates%20on%20dark%20background%2C%20holographic%20AI%20analysis%20interface%20emerald%20green&width=480&height=360&seq=step002&orientation=landscape',
  },
  {
    num: '03',
    icon: 'ri-heart-pulse-line',
    title: 'Следите за прогрессом',
    desc: 'Смотрите наглядные графики питания, получайте персональные рекомендации и общайтесь с ИИ-нутрициологом.',
    image: 'https://readdy.ai/api/search-image?query=healthy%20person%20looking%20at%20smartphone%20with%20fitness%20progress%20charts%20weight%20loss%20graphs%20nutrition%20dashboard%20green%20emerald%20theme%2C%20modern%20lifestyle%20wellness%20app%20interface%2C%20clean%20white%20background&width=480&height=360&seq=step003&orientation=landscape',
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep((p) => (p + 1) % steps.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="how-it-works"
      className="relative py-24 px-6"
      style={{ background: '#050d05' }}
    >
      <div ref={sectionRef} className="max-w-7xl mx-auto">
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
            className="inline-block px-4 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              background: 'rgba(0,230,118,0.1)',
              border: '1px solid rgba(0,230,118,0.3)',
              color: '#00e676',
            }}
          >
            Как это работает
          </span>
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Три простых шага к{' '}
            <span style={{ color: '#1de9b6' }}>здоровому питанию</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Начните уже сегодня — это займёт меньше минуты
          </p>
        </div>

        {/* Steps layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left steps */}
          <div className="flex flex-col gap-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="flex gap-5 p-5 rounded-2xl cursor-pointer transition-all duration-400"
                style={{
                  background:
                    activeStep === i
                      ? 'rgba(0,230,118,0.07)'
                      : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${activeStep === i ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  transform: visible
                    ? activeStep === i
                      ? 'translateX(8px)'
                      : 'translateX(0)'
                    : 'translateX(-40px)',
                  opacity: visible ? 1 : 0,
                  transition: `all 0.6s ease ${i * 0.15}s`,
                }}
                onClick={() => setActiveStep(i)}
              >
                {/* Number */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm"
                    style={{
                      background:
                        activeStep === i
                          ? 'linear-gradient(135deg, #00e676, #1de9b6)'
                          : 'rgba(255,255,255,0.06)',
                      color: activeStep === i ? '#000' : '#666',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <i
                      className={`${step.icon} text-lg`}
                      style={{ color: activeStep === i ? '#000' : '#666' }}
                    />
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-px flex-1 min-h-8"
                      style={{
                        background: activeStep >= i
                          ? 'linear-gradient(to bottom, #00e676, transparent)'
                          : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.5s ease',
                      }}
                    />
                  )}
                </div>
                {/* Content */}
                <div className="pt-1">
                  <div
                    className="text-xs font-bold mb-1"
                    style={{ color: activeStep === i ? '#00e676' : '#444' }}
                  >
                    ШАГ {step.num}
                  </div>
                  <h3
                    className="font-bold text-lg mb-1 transition-colors duration-300"
                    style={{ color: activeStep === i ? '#fff' : '#888' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed transition-colors duration-300"
                    style={{ color: activeStep === i ? '#9ca3af' : '#555' }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right image */}
          <div
            style={{
              transform: visible ? 'translateX(0) scale(1)' : 'translateX(60px) scale(0.95)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s',
            }}
          >
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(0,230,118,0.2)',
                aspectRatio: '4/3',
              }}
            >
              {steps.map((step, i) => (
                <img
                  key={step.num}
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover object-top absolute inset-0 transition-all duration-700"
                  style={{
                    opacity: activeStep === i ? 1 : 0,
                    transform: activeStep === i ? 'scale(1)' : 'scale(1.05)',
                  }}
                />
              ))}
              {/* Step indicator */}
              <div
                className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2"
              >
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className="rounded-full transition-all duration-300 cursor-pointer"
                    style={{
                      width: activeStep === i ? '24px' : '8px',
                      height: '8px',
                      background: activeStep === i ? '#00e676' : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </div>
              {/* Corner glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(0,230,118,0.2) 0%, transparent 70%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
