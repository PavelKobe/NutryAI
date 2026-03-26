import { useEffect, useRef, useState } from 'react';

const models = [
  {
    name: 'Gemini 2.0 Pro',
    role: 'Распознавание еды по фото',
    accuracy: '85%+',
    icon: 'ri-eye-2-line',
    color: '#00e676',
  },
  {
    name: 'GPT-4o',
    role: 'Генерация планов питания и рецептов',
    accuracy: '98%',
    icon: 'ri-sparkling-2-line',
    color: '#1de9b6',
  },
  {
    name: 'Claude 3.7 Sonnet',
    role: 'Персональный чат-бот нутрициолог',
    accuracy: '24/7',
    icon: 'ri-chat-3-line',
    color: '#69f0ae',
  },
  {
    name: 'Gemini 2.0 Flash',
    role: 'Генерация изображений рецептов',
    accuracy: 'Real-time',
    icon: 'ri-image-ai-line',
    color: '#00bcd4',
  },
];

export default function AIModelsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeModel, setActiveModel] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveModel((p) => (p + 1) % models.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="ai-models"
      className="relative py-24 px-6"
      style={{
        background:
          'linear-gradient(180deg, #060d06 0%, #05100e 50%, #060d06 100%)',
      }}
    >
      <div ref={sectionRef} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Brain visual */}
          <div
            className="relative"
            style={{
              transform: visible ? 'translateX(0)' : 'translateX(-60px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(0,230,118,0.05)',
                border: '1px solid rgba(0,230,118,0.15)',
                aspectRatio: '4/3',
              }}
            >
              <img
                src="https://readdy.ai/api/search-image?query=futuristic%20glowing%20green%20neural%20network%20AI%20brain%20holographic%203D%20visualization%20with%20circuit%20patterns%20on%20dark%20background%2C%20digital%20brain%20with%20emerald%20green%20neon%20connections%2C%20technology%20concept%20art%20with%20teal%20highlights%20and%20black%20background&width=800&height=600&seq=ai001&orientation=landscape"
                alt="AI Brain"
                className="w-full h-full object-cover object-top"
              />
              {/* Glow overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, transparent 50%, rgba(29,233,182,0.1) 100%)',
                }}
              />
              {/* Animated lines */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: `${20 + i * 20}%`,
                    background: `linear-gradient(90deg, transparent, rgba(0,230,118,${0.3 - i * 0.05}), transparent)`,
                    animation: `scanLine ${2 + i * 0.5}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>

            {/* Floating stat card */}
            <div
              className="absolute -bottom-6 -right-6 rounded-2xl p-4"
              style={{
                background: 'rgba(5,13,5,0.9)',
                border: '1px solid rgba(0,230,118,0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,230,118,0.2)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,230,118,0.2)' }}
                >
                  <i className="ri-flashlight-line text-emerald-400" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-none">4 ИИ-модели</div>
                  <div className="text-gray-500 text-xs mt-0.5">работают на вас</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Models list */}
          <div
            style={{
              transform: visible ? 'translateX(0)' : 'translateX(60px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s',
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
              Технологии
            </span>
            <h2
              className="text-4xl md:text-5xl font-black text-white mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              4 ИИ-модели{' '}
              <span style={{ color: '#00e676' }}>работают</span> на вас
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Мы интегрировали лучшие языковые модели мира, чтобы дать вам
              точный анализ питания, умные рекомендации и живое общение
              с ИИ-нутрициологом.
            </p>

            <div className="flex flex-col gap-3">
              {models.map((model, i) => (
                <div
                  key={model.name}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300"
                  style={{
                    background:
                      activeModel === i
                        ? `rgba(${model.color === '#00e676' ? '0,230,118' : model.color === '#1de9b6' ? '29,233,182' : model.color === '#69f0ae' ? '105,240,174' : '0,188,212'},0.1)`
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activeModel === i ? model.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    transform: activeModel === i ? 'translateX(8px)' : 'translateX(0)',
                  }}
                  onClick={() => setActiveModel(i)}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${model.color}20`,
                      border: `1px solid ${model.color}40`,
                    }}
                  >
                    <i
                      className={`${model.icon} text-lg`}
                      style={{ color: model.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold text-sm notranslate"
                        translate="no"
                        style={{ color: model.color }}
                      >
                        {model.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: `${model.color}20`,
                          color: model.color,
                        }}
                      >
                        {model.accuracy}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">—&nbsp;{model.role}</span>
                  </div>
                  {activeModel === i && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: model.color,
                        boxShadow: `0 0 8px ${model.color}`,
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          from { opacity: 0.1; transform: scaleX(0.5); }
          to { opacity: 0.6; transform: scaleX(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </section>
  );
}
