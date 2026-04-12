'use client';

import { useEffect, useRef, useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: string;
  items: FAQItem[];
}

const CATEGORIES: FAQCategory[] = [
  {
    id: 'general',
    label: 'Общее',
    icon: 'ri-question-line',
    items: [
      {
        q: 'Что такое NutriAI и как это работает?',
        a: 'NutriAI — это умный ИИ-дневник питания, который объединяет несколько нейросетей (Gemini Pro, GPT-5, Claude). Вы фотографируете еду — ИИ мгновенно распознаёт блюдо, определяет состав и КБЖУ, добавляет в дневник и строит рекомендации под ваши цели.',
      },
      {
        q: 'Нужно ли скачивать приложение?',
        a: 'NutriAI работает прямо в браузере — никаких загрузок не нужно. Также доступны приложения для iOS и Android, если хочется использовать камеру прямо из телефона для мгновенного сканирования.',
      },
      {
        q: 'Поддерживается ли русская кухня?',
        a: 'Да, это одно из наших главных отличий! База данных включает тысячи российских блюд — борщ, пельмени, блины, солянка, гречка и многое другое. Модель обучена специально на российской кухне и распознаёт домашние блюда, а не только ресторанные.',
      },
      {
        q: 'Насколько точно ИИ определяет калории?',
        a: 'Точность распознавания составляет 85–92% для стандартных блюд. Для домашней еды точность немного ниже, но вы всегда можете скорректировать порцию вручную. Чем больше вы используете приложение, тем лучше оно подстраивается под вас.',
      },
    ],
  },
  {
    id: 'features',
    label: 'Функции',
    icon: 'ri-star-line',
    items: [
      {
        q: 'Что умеет ИИ-нутрициолог?',
        a: 'ИИ-нутрициолог отвечает на любые вопросы о питании, составляет персональные планы питания на неделю с учётом ваших целей, бюджета и предпочтений, анализирует ваш рацион и указывает на дефициты витаминов и минералов, а также предлагает замены продуктов.',
      },
      {
        q: 'Можно ли генерировать рецепты под мои продукты?',
        a: 'Да! Введите что есть в холодильнике — ИИ создаст рецепты с пошаговыми инструкциями, КБЖУ и временем приготовления. Система учитывает ваш бюджет, ограничения по аллергенам и диетические предпочтения.',
      },
      {
        q: 'Какая аналитика доступна?',
        a: 'Вы видите графики калорий и макросов за день, неделю и месяц, динамику веса, дефицит/профицит калорий, микронутриентный анализ (витамины, минералы) и сравнение с нормами ВОЗ. All Inclusive-пользователи получают расширенные AI-отчёты.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Тарифы',
    icon: 'ri-price-tag-3-line',
    items: [
      {
        q: 'Что входит в бесплатный план?',
        a: 'Бесплатный план включает 10 сканирований еды в день, базовый дневник питания, расчёт КБЖУ, 3 вопроса ИИ-нутрициологу в сутки и базовую аналитику. Этого достаточно, чтобы полноценно начать следить за питанием.',
      },
      {
        q: 'Чем All Inclusive отличается от Free?',
        a: 'All Inclusive снимает все ограничения: безлимитное сканирование, неограниченный чат с ИИ-нутрициологом, генерация планов питания и рецептов, расширенная аналитика с AI-отчётами, приоритетная поддержка и ранний доступ к новым функциям.',
      },
      {
        q: 'Можно ли отменить подписку в любой момент?',
        a: 'Да, подписку можно отменить в любое время без штрафов и объяснений. После отмены доступ к All Inclusive сохраняется до конца оплаченного периода. Возврат средств возможен в течение 7 дней после оплаты.',
      },
      {
        q: 'Есть ли скидка при годовой оплате?',
        a: 'Да! При оплате на год вы экономите 40% по сравнению с ежемесячной подпиской. Годовой план стоит от 390 ₽/месяц вместо 649 ₽/месяц. Корпоративные тарифы рассчитываются индивидуально.',
      },
    ],
  },
  {
    id: 'tech',
    label: 'Технологии',
    icon: 'ri-robot-2-line',
    items: [
      {
        q: 'Какие ИИ-модели используются?',
        a: 'NutriAI использует ансамбль из нескольких моделей: Gemini Pro для распознавания изображений еды, GPT-5 для нутрициологических советов и составления планов питания, Claude для анализа длинных историй питания. Каждый запрос автоматически направляется к наиболее подходящей модели.',
      },
      {
        q: 'Безопасны ли мои данные?',
        a: 'Ваши данные хранятся на серверах в России, зашифрованы по AES-256 и никогда не передаются третьим лицам. Мы соответствуем требованиям 152-ФЗ о персональных данных. Вы можете в любой момент скачать или полностью удалить все свои данные.',
      },
      {
        q: 'Работает ли приложение офлайн?',
        a: 'Базовые функции дневника питания (просмотр истории, добавление из избранного) работают офлайн. Распознавание фото и ИИ-нутрициолог требуют подключения к интернету. Данные синхронизируются автоматически при восстановлении соединения.',
      },
    ],
  },
];

function AccordionItem({
  item,
  index,
  isOpen,
  onToggle,
  catColor,
}: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  catColor: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (isOpen) {
      setHeight(bodyRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: isOpen ? 'rgba(0,230,118,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isOpen ? 'rgba(0,230,118,0.25)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isOpen ? '0 8px 32px rgba(0,230,118,0.08)' : 'none',
        transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left cursor-pointer group"
      >
        {/* Index badge */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300"
          style={{
            background: isOpen ? catColor : 'rgba(255,255,255,0.06)',
            color: isOpen ? '#000' : '#666',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <span
          className="flex-1 text-sm md:text-base font-semibold leading-snug transition-colors duration-300"
          style={{ color: isOpen ? '#ffffff' : '#bbb', fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          {item.q}
        </span>

        {/* Toggle icon */}
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-400"
          style={{
            background: isOpen ? catColor : 'rgba(255,255,255,0.06)',
            color: isOpen ? '#000' : '#555',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, color 0.3s ease',
          }}
        >
          <i className="ri-add-line text-sm" />
        </span>
      </button>

      {/* Body — animated height */}
      <div
        style={{
          height: `${height}px`,
          overflow: 'hidden',
          transition: 'height 0.42s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div ref={bodyRef} className="px-6 pb-5">
          <div
            className="h-px w-full mb-4"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          <p
            className="text-gray-400 text-sm leading-relaxed"
            style={{ paddingLeft: '44px' }}
          >
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  general: '#00e676',
  features: '#1de9b6',
  pricing: '#69f0ae',
  tech: '#b9f6ca',
};

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [prevCat, setPrevCat] = useState('general');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCategoryChange = (id: string) => {
    if (id === activeCategory) return;
    setPrevCat(activeCategory);
    setActiveCategory(id);
    setOpenIndex(0);
  };

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory)!;
  const catColor = CAT_COLORS[activeCategory] ?? '#00e676';

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: '#070e07' }}
    >
      {/* top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #060d06, transparent)' }}
      />

      {/* glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-100px', right: '-100px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${catColor}0d 0%, transparent 70%)`,
          transition: 'background 0.6s ease',
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Title */}
        <div
          className="text-center mb-14"
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
            <i className="ri-question-answer-line" />
            Частые вопросы
          </span>
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Всё, что хочется{' '}
            <span style={{ color: '#00e676', textShadow: '0 0 30px rgba(0,230,118,0.4)' }}>
              узнать
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Ответы на самые популярные вопросы о NutriAI
          </p>
        </div>

        {/* Category tabs */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-10"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.7s ease 0.15s',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-all duration-300"
                style={{
                  background: isActive ? CAT_COLORS[cat.id] : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#000' : '#888',
                  border: `1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isActive ? `0 4px 20px ${CAT_COLORS[cat.id]}40` : 'none',
                }}
              >
                <i className={`${cat.icon} text-sm`} />
                {cat.label}
                <span
                  className="text-xs rounded-full px-1.5 py-0.5 font-semibold"
                  style={{
                    background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#000' : '#666',
                  }}
                >
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Accordion list */}
        <div
          key={activeCategory}
          className="flex flex-col gap-3"
          style={{
            animation: `faqSlideIn 0.4s ease`,
          }}
        >
          {currentCat.items.map((item, i) => (
            <div
              key={`${activeCategory}-${i}`}
              style={{
                animation: `faqItemIn 0.35s ease ${i * 60}ms both`,
              }}
            >
              <AccordionItem
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                catColor={catColor}
              />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-14 text-center"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.7s ease 0.4s',
          }}
        >
          <div
            className="inline-flex flex-col sm:flex-row items-center gap-4 px-8 py-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="text-center sm:text-left">
              <div className="text-white font-semibold text-sm">Остались вопросы?</div>
              <div className="text-gray-500 text-xs mt-0.5">Напишите нам — ответим в течение 2 часов</div>
            </div>
            <a
              href="mailto:support@nutriai.ru"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00e676, #1de9b6)',
                color: '#000',
              }}
            >
              <i className="ri-mail-line" />
              Написать в поддержку
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes faqSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes faqItemIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
