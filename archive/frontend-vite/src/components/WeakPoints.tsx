import { AlertTriangle } from "lucide-react";

const weakPoints = [
  {
    area: "Интеграция биоданных",
    detail:
      "Слабое использование генетических тестов, анализа микробиоты и биомаркеров для прецизионной диетологии",
    impact: "Высокий",
  },
  {
    area: "Этика и конфиденциальность",
    detail:
      "Недостаточно проработаны механизмы предотвращения алгоритмической предвзятости и защиты медицинских данных",
    impact: "Высокий",
  },
  {
    area: "Профилактика заболеваний",
    detail:
      "Отсутствие проактивного прогнозирования рисков хронических заболеваний на основе пищевых привычек",
    impact: "Средний",
  },
  {
    area: "Адаптация в реальном времени",
    detail:
      "Рекомендации не адаптируются к текущему физиологическому состоянию (стресс, усталость, гормоны)",
    impact: "Средний",
  },
  {
    area: "Редкие диетические потребности",
    detail:
      "Слабая поддержка специфических или редких диетических ограничений и медицинских показаний",
    impact: "Средний",
  },
];

const impactColors: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-400",
  Средний: "bg-orange-500/15 text-orange-400",
  Низкий: "bg-yellow-500/15 text-yellow-400",
};

export default function WeakPoints() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <AlertTriangle className="w-7 h-7 text-orange-400" />
        Слабые места конкурентов
      </h2>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Область
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Описание проблемы
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Влияние
              </th>
            </tr>
          </thead>
          <tbody>
            {weakPoints.map((w, i) => (
              <tr
                key={i}
                className={`border-b border-[#1e1e2e] hover:bg-[#1a1a28] transition-colors ${
                  i % 2 === 0 ? "bg-[#12121a]" : "bg-[#0f0f18]"
                }`}
              >
                <td className="px-6 py-4 text-white font-medium text-base">
                  {w.area}
                </td>
                <td className="px-6 py-4 text-[#c5cee0] text-sm leading-relaxed">
                  {w.detail}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${impactColors[w.impact]}`}
                  >
                    {w.impact}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}