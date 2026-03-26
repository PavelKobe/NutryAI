import { Trophy } from "lucide-react";

const features = [
  {
    rank: 1,
    name: "Распознавание еды по фото (Computer Vision)",
    priority: "MVP",
    description: "Автоматический подсчёт калорий и нутриентов по фотографии блюда",
  },
  {
    rank: 2,
    name: "ИИ чат-бот нутрициолог 24/7",
    priority: "MVP",
    description: "Персональный ИИ-консультант по питанию с контекстным пониманием",
  },
  {
    rank: 3,
    name: "Персонализированные планы питания",
    priority: "MVP",
    description: "Автогенерация меню с учётом целей, аллергий, бюджета и предпочтений",
  },
  {
    rank: 4,
    name: "Трекер калорий и макронутриентов",
    priority: "MVP",
    description: "Дневник питания с визуализацией прогресса и динамической коррекцией целей",
  },
  {
    rank: 5,
    name: "Генерация рецептов под цели",
    priority: "MVP",
    description: "ИИ создаёт рецепты с учётом диеты, доступных продуктов и времени",
  },
  {
    rank: 6,
    name: "Поведенческий коучинг (КПТ-подход)",
    priority: "v2.0",
    description: "Выявление триггеров переедания, формирование здоровых привычек",
  },
  {
    rank: 7,
    name: "Сканер штрих-кодов и меню ресторанов",
    priority: "v2.0",
    description: "Мгновенный анализ продуктов в магазине и блюд в ресторане",
  },
  {
    rank: 8,
    name: "Интеграция с фитнес-устройствами",
    priority: "v2.0",
    description: "Синхронизация с Apple Health, Google Fit, умными весами",
  },
  {
    rank: 9,
    name: "Прецизионная диетология (биоданные)",
    priority: "v3.0",
    description: "Интеграция генетических тестов, микробиоты и биомаркеров",
  },
  {
    rank: 10,
    name: "Предиктивная профилактика заболеваний",
    priority: "v3.0",
    description: "Прогнозирование рисков на основе анализа пищевых привычек",
  },
];

const priorityStyles: Record<string, string> = {
  MVP: "bg-green-500/15 text-green-400 border border-green-500/30",
  "v2.0": "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  "v3.0": "bg-purple-500/15 text-purple-400 border border-purple-500/30",
};

export default function TopFeatures() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Trophy className="w-7 h-7 text-yellow-400" />
        ТОП-10 функций для вашего приложения
      </h2>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
              <th className="px-5 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider w-16 text-center">
                #
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Функция
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Описание
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider w-28 text-center">
                Приоритет
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr
                key={i}
                className={`border-b border-[#1e1e2e] hover:bg-[#1a1a28] transition-colors ${
                  i % 2 === 0 ? "bg-[#12121a]" : "bg-[#0f0f18]"
                }`}
              >
                <td className="px-5 py-4 text-center">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      f.rank <= 3
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-white/5 text-[#8f9bb3]"
                    }`}
                  >
                    {f.rank}
                  </span>
                </td>
                <td className="px-5 py-4 text-white font-medium text-base">
                  {f.name}
                </td>
                <td className="px-5 py-4 text-[#c5cee0] text-sm leading-relaxed">
                  {f.description}
                </td>
                <td className="px-5 py-4 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${priorityStyles[f.priority]}`}
                  >
                    {f.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-6 mt-4 px-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500/40" />
          <span className="text-xs text-[#8f9bb3]">MVP — запуск</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500/40" />
          <span className="text-xs text-[#8f9bb3]">v2.0 — развитие</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500/40" />
          <span className="text-xs text-[#8f9bb3]">v3.0 — инновации</span>
        </div>
      </div>
    </section>
  );
}