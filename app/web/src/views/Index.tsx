import MarketStats from "@/components/MarketStats";
import UserFavorites from "@/components/UserFavorites";
import WeakPoints from "@/components/WeakPoints";
import TopFeatures from "@/components/TopFeatures";
import CompetitorMatrix from "@/components/CompetitorMatrix";
import KeyInsight from "@/components/KeyInsight";
import { Utensils } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/20">
              <Utensils className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                AI Nutrition App
              </h1>
              <p className="text-xs text-[#8f9bb3]">
                Сводный анализ конкурентов
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
              Рынок: $3.66 млрд
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
              CAGR: 23.1%
            </span>
            <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
              2025
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-12">
        {/* Hero */}
        <div className="text-center mb-4">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
            Анализ рынка ИИ-приложений для правильного питания
          </h2>
          <p className="text-[#8f9bb3] text-lg max-w-3xl mx-auto">
            Конкурентный анализ, пользовательские предпочтения, рыночные пробелы
            и рекомендации по функционалу нового продукта
          </p>
        </div>

        {/* Market Stats */}
        <MarketStats />

        {/* Competitor Matrix */}
        <CompetitorMatrix />

        {/* User Favorites */}
        <UserFavorites />

        {/* Weak Points */}
        <WeakPoints />

        {/* Top Features */}
        <TopFeatures />

        {/* Key Insight */}
        <KeyInsight />

        {/* Footer */}
        <footer className="border-t border-[#1e1e2e] pt-8 pb-4 text-center">
          <p className="text-[#8f9bb3] text-sm">
            Источники: Jenova.ai, Skillbox, vc.ru, GlobalDev, App Store,
            Google Play, PopularNutrition.ru
          </p>
          <p className="text-[#555] text-xs mt-2">
            AI Nutrition App — Competitive Analysis Dashboard © 2025
          </p>
        </footer>
      </main>
    </div>
  );
}