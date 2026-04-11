'use client';

const TELEGRAM_BOT_URL = 'https://t.me/NutriAIDiaryBot';

const steps = [
  { icon: '1', title: 'Найдите бота', desc: '@NutriAIDiaryBot в Telegram' },
  { icon: '2', title: 'Привяжите аккаунт', desc: 'Отправьте email от nutriaidiary.com' },
  { icon: '3', title: 'Логируйте еду', desc: 'Пишите текстом или отправляйте фото' },
];

export default function TelegramSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-blue-400 text-sm font-medium">Telegram Bot</span>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Логируйте еду прямо в{' '}
          <span className="text-blue-400">Telegram</span>
        </h2>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto">
          Напишите что съели или отправьте фото — бот определит КБЖУ и запишет в дневник.
          Без открытия сайта, за 5 секунд.
        </p>

        {/* Chat demo */}
        <div className="max-w-sm mx-auto mb-12 rounded-2xl bg-slate-900/80 border border-slate-800/50 overflow-hidden">
          <div className="bg-blue-500/10 px-4 py-3 flex items-center gap-3 border-b border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#15803d" />
                <path fill="#bbf7d0" d="M16 5c-5 9-5 16 0 22 5-6 5-13 0-22z" />
              </svg>
            </div>
            <span className="font-medium text-sm">NutriAI Diary Bot</span>
          </div>
          <div className="p-4 space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-blue-500/20 text-blue-100 px-4 py-2 rounded-2xl rounded-br-md text-sm max-w-[80%]">
                Съел 200г гречки и куриную грудку
              </div>
            </div>
            {/* Bot response */}
            <div className="flex justify-start">
              <div className="bg-slate-800/80 text-slate-200 px-4 py-2 rounded-2xl rounded-bl-md text-sm max-w-[85%] text-left">
                <div className="mb-1">Записано!</div>
                <div className="text-slate-400 text-xs space-y-0.5">
                  <div>Гречка 200г — 264 ккал</div>
                  <div>Куриная грудка 150г — 165 ккал</div>
                  <div className="text-emerald-400 mt-1">Итого: 429 ккал</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {steps.map((step) => (
            <div key={step.icon} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-3 mx-auto">
                {step.icon}
              </div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-slate-400 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Открыть бота в Telegram
        </a>
      </div>
    </section>
  );
}
