import { TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";

const stats = [
  {
    icon: DollarSign,
    label: "Объём рынка 2024",
    value: "$3.66 млрд",
    sub: "рост с $1.6 млрд в 2022",
    color: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-400",
  },
  {
    icon: TrendingUp,
    label: "Годовой рост (CAGR)",
    value: "23.1%",
    sub: "совокупный годовой темп",
    color: "from-green-500 to-emerald-400",
    iconColor: "text-green-400",
  },
  {
    icon: BarChart3,
    label: "Прогноз 2025",
    value: "$8.51 млрд",
    sub: "ожидаемый объём рынка",
    color: "from-purple-500 to-violet-400",
    iconColor: "text-purple-400",
  },
  {
    icon: Users,
    label: "Пользователи (США)",
    value: "63+ млн",
    sub: "активных пользователей к 2025",
    color: "from-orange-500 to-amber-400",
    iconColor: "text-orange-400",
  },
];

export default function MarketStats() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-blue-400" />
        Рыночные данные
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6 overflow-hidden group hover:border-[#2a2a3e] transition-all duration-300"
          >
            <div
              className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${s.color}`}
            />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-white/5">
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <span className="text-sm text-[#8f9bb3] font-medium">
                {s.label}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
            <div className="text-xs text-[#8f9bb3]">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}