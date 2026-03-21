'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Brain,
  CalendarDays,
  MessageCircle,
  BarChart3,
  ChefHat,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const HERO_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1042541/2026-03-20/18af8308-cd8e-4c9f-a62c-a1a75f05d0f9.png';
const AI_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1042541/2026-03-20/93c8dcec-ab76-4d5b-8510-6a1d7b9188f1.png';

const FEATURES = [
  {
    icon: Camera,
    title: 'Распознавание еды по фото',
    desc: 'Сфотографируйте блюдо — ИИ определит состав и КБЖУ за 3 секунды',
    color: 'from-emerald-500 to-green-600',
  },
  {
    icon: CalendarDays,
    title: 'Персональный план питания',
    desc: 'ИИ составит план на неделю с учётом ваших целей, бюджета и предпочтений',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: MessageCircle,
    title: 'ИИ-нутрициолог 24/7',
    desc: 'Задайте любой вопрос о питании — получите персональный ответ',
    color: 'from-purple-500 to-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Аналитика и прогресс',
    desc: 'Отслеживайте калории, БЖУ и вес с наглядными графиками',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: ChefHat,
    title: 'Генерация рецептов',
    desc: 'ИИ создаст рецепты под ваш бюджет и доступные продукты',
    color: 'from-rose-500 to-red-600',
  },
  {
    icon: Brain,
    title: 'Умный дневник питания',
    desc: 'Добавляйте еду по фото или вручную — всё автоматически считается',
    color: 'from-cyan-500 to-teal-600',
  },
];

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // not logged in
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              NutriAI
            </span>
          </div>
          <Button
            onClick={handleLogin}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6"
          >
            Войти
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Powered by AI</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Ваш персональный{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-indigo-400 bg-clip-text text-transparent">
                  ИИ-нутрициолог
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-xl">
                Распознавание еды по фото, персональные планы питания, 
                умный дневник и чат с ИИ-нутрициологом — всё в одном приложении.
                Адаптировано для российских продуктов и кухни.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleLogin}
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-emerald-500/25"
                >
                  Начать бесплатно
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span>✓ Бесплатно</span>
                <span>✓ Без рекламы</span>
                <span>✓ Русский язык</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 rounded-3xl blur-2xl" />
              <img
                src={HERO_IMG}
                alt="Здоровое питание"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-video"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Умное питание с{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                искусственным интеллектом
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              6 ИИ-функций, которые помогут вам достичь целей в питании
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all hover:shadow-lg"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              <img
                src={AI_IMG}
                alt="AI технологии"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-video"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold">
                4 ИИ-модели{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  работают на вас
                </span>
              </h2>
              <div className="space-y-4">
                {[
                  { name: 'Gemini Pro', desc: 'Распознавание еды по фото с точностью 85%+' },
                  { name: 'GPT-5', desc: 'Генерация планов питания и рецептов' },
                  { name: 'Claude Sonnet', desc: 'Персональный чат-бот нутрициолог' },
                  { name: 'Gemini Flash', desc: 'Генерация изображений рецептов' },
                ].map((m) => (
                  <div key={m.name} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-emerald-400">{m.name}</span>
                      <span className="text-slate-400 ml-2">— {m.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Начните питаться правильно уже сегодня
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Бесплатная Demo-версия — все ИИ-функции доступны без ограничений
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-10 py-6 text-lg font-semibold shadow-lg shadow-emerald-500/25"
            >
              Создать аккаунт бесплатно
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500 text-sm">
            ⚠️ NutriAI не заменяет консультацию врача-диетолога. 
            Перед изменением рациона проконсультируйтесь со специалистом.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            NutriAI Demo © 2026 — Powered by Atoms Cloud
          </p>
        </div>
      </footer>
    </div>
  );
}