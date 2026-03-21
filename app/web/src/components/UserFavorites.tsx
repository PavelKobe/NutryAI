import { Heart } from "lucide-react";

const favorites = [
  {
    feature: "Распознавание еды по фото",
    reason:
      "Мгновенный подсчёт калорий без ручного ввода — удобно и быстро",
    app: "Foodvisor, Carmen AI",
  },
  {
    feature: "Персонализированные планы питания",
    reason:
      "Учёт целей, аллергий, предпочтений и времени на готовку — ощущение индивидуального подхода",
    app: "Lifesum, PlateJoy",
  },
  {
    feature: "ИИ чат-бот нутрициолог",
    reason:
      "Доступ к экспертным советам 24/7 без записи к специалисту",
    app: "GPTunnel, SmartEat",
  },
  {
    feature: "Поведенческий коучинг (КПТ)",
    reason:
      "Помогает изменить привычки, а не просто считать калории — долгосрочный результат",
    app: "Noom",
  },
  {
    feature: "Сканер штрих-кодов продуктов",
    reason:
      "Быстрый ввод данных в магазине, точная информация о составе",
    app: "MyFitnessPal, SmartEat",
  },
  {
    feature: "Генерация рецептов под цели",
    reason:
      "Не нужно искать рецепты самому — ИИ подбирает с учётом всех ограничений",
    app: "Fitia, Lifesum",
  },
  {
    feature: "Интеграция с фитнес-устройствами",
    reason:
      "Единая экосистема здоровья: питание + активность + сон в одном месте",
    app: "MyFitnessPal, Lifesum",
  },
];

export default function UserFavorites() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Heart className="w-7 h-7 text-pink-400" />
        Что нравится пользователям
      </h2>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Функция
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Почему нравится
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider">
                Лучшие примеры
              </th>
            </tr>
          </thead>
          <tbody>
            {favorites.map((f, i) => (
              <tr
                key={i}
                className={`border-b border-[#1e1e2e] hover:bg-[#1a1a28] transition-colors ${
                  i % 2 === 0 ? "bg-[#12121a]" : "bg-[#0f0f18]"
                }`}
              >
                <td className="px-6 py-4 text-white font-medium text-base">
                  {f.feature}
                </td>
                <td className="px-6 py-4 text-[#c5cee0] text-sm leading-relaxed">
                  {f.reason}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-pink-500/10 text-pink-300 text-xs font-medium">
                    {f.app}
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