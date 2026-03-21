import { Lightbulb, Target, Shield, Brain, Sparkles } from "lucide-react";

const usps = [
  {
    icon: Brain,
    title: "Прецизионная диетология",
    desc: "Интеграция генетических данных, микробиоты и биомаркеров для максимально точных рекомендаций",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Sparkles,
    title: "Мультимодельный ИИ",
    desc: "Умное переключение между ИИ-моделями для наилучшего результата в каждой задаче",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Этичный ИИ",
    desc: "Прозрачность данных, защита конфиденциальности и минимизация алгоритмической предвзятости",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Target,
    title: "Проактивная профилактика",
    desc: "Прогнозирование рисков заболеваний и адаптация рациона в реальном времени",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export default function KeyInsight() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Lightbulb className="w-7 h-7 text-yellow-400" />
        Ключевой вывод и УТП
      </h2>

      {/* Main insight card */}
      <div className="rounded-xl border border-[#1e1e2e] bg-gradient-to-br from-[#12121a] to-[#1a1028] p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-yellow-500/10 shrink-0">
            <Lightbulb className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-3">
              Главный вывод анализа
            </h3>
            <p className="text-[#c5cee0] text-base leading-relaxed">
              Рынок ИИ-приложений для питания растёт на{" "}
              <span className="text-green-400 font-semibold">23% в год</span>,
              но ни один конкурент не покрывает{" "}
              <span className="text-yellow-400 font-semibold">
                все ключевые функции
              </span>{" "}
              одновременно. Главные пробелы — отсутствие глубокой интеграции
              биоданных, слабая поведенческая поддержка и отсутствие
              предиктивной профилактики заболеваний. Ваше приложение может
              занять уникальную нишу{" "}
              <span className="text-purple-400 font-semibold">
                «полного цикла ИИ-нутрициологии»
              </span>
              , объединив лучшие практики конкурентов и закрыв существующие
              пробелы.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg bg-white/5 p-4 border border-white/5">
            <div className="text-sm text-[#8f9bb3] mb-2">
              Стратегия выхода
            </div>
            <div className="text-white font-medium">
              MVP с 5 ключевыми функциями → быстрый запуск → итеративное
              развитие на основе фидбека
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-4 border border-white/5">
            <div className="text-sm text-[#8f9bb3] mb-2">
              Целевая аудитория
            </div>
            <div className="text-white font-medium">
              Поколение Z и миллениалы, ищущие персонализированный и
              научно-обоснованный подход к питанию
            </div>
          </div>
        </div>
      </div>

      {/* USP cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {usps.map((u, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-5 hover:border-[#2a2a3e] transition-all duration-300"
          >
            <div className={`p-2 rounded-lg ${u.bg} w-fit mb-3`}>
              <u.icon className={`w-5 h-5 ${u.color}`} />
            </div>
            <h4 className="text-white font-semibold text-base mb-2">
              {u.title}
            </h4>
            <p className="text-[#8f9bb3] text-sm leading-relaxed">{u.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}