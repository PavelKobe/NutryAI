'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import AnalyticsSkeleton from '@/components/skeletons/AnalyticsSkeleton';
import { BarChart3, TrendingUp, Scale, Flame, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShareStatsModal from '@/components/share/ShareStatsModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MealLogItem {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged_at: string;
}

interface WeightLogItem {
  weight_kg: number;
  logged_at: string;
}

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

export default function Analytics() {
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number; protein: number; fat: number; carbs: number }[]>([]);
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [todayMacros, setTodayMacros] = useState({ protein: 0, fat: 0, carbs: 0 });
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load meal logs
      const logsRes = await client.entities.meal_logs.query({
        sort: '-logged_at',
        limit: 200,
      });
      const logs: MealLogItem[] = logsRes?.data?.items || [];

      // Group by day for last 7 days
      const now = new Date();
      const weekData: Record<string, { calories: number; protein: number; fat: number; carbs: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        weekData[key] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      }

      const today = now.toISOString().split('T')[0];
      let todayP = 0, todayF = 0, todayC = 0;

      logs.forEach((log) => {
        const logDate = (log.logged_at || '').split('T')[0];
        if (weekData[logDate]) {
          weekData[logDate].calories += log.calories || 0;
          weekData[logDate].protein += log.protein || 0;
          weekData[logDate].fat += log.fat || 0;
          weekData[logDate].carbs += log.carbs || 0;
        }
        if (logDate === today) {
          todayP += log.protein || 0;
          todayF += log.fat || 0;
          todayC += log.carbs || 0;
        }
      });

      const chartData = Object.entries(weekData).map(([date, data], i) => ({
        day: DAYS_SHORT[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1] || date.slice(5),
        ...data,
      }));
      setWeeklyData(chartData);
      setTodayMacros({ protein: Math.round(todayP), fat: Math.round(todayF), carbs: Math.round(todayC) });

      // Load weight logs
      const weightRes = await client.entities.weight_logs.query({
        sort: 'logged_at',
        limit: 30,
      });
      const weights: WeightLogItem[] = weightRes?.data?.items || [];
      setWeightData(
        weights.map((w) => ({
          date: (w.logged_at || '').split('T')[0]?.slice(5) || '',
          weight: w.weight_kg,
        }))
      );
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Аналитика">
        <AnalyticsSkeleton />
      </AppLayout>
    );
  }

  const totalMacros = todayMacros.protein + todayMacros.fat + todayMacros.carbs;
  const pieData = totalMacros > 0
    ? [
        { name: 'Белки', value: todayMacros.protein, color: '#ef4444' },
        { name: 'Жиры', value: todayMacros.fat, color: '#f59e0b' },
        { name: 'Углеводы', value: todayMacros.carbs, color: '#3b82f6' },
      ]
    : [{ name: 'Нет данных', value: 1, color: '#334155' }];

  return (
    <AppLayout title="Аналитика">
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-400" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" /> Поделиться
        </Button>
      </div>
      <div className="space-y-6">
        {/* Today's Macros Pie */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" /> БЖУ сегодня
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: 'Белки', value: todayMacros.protein, color: 'bg-red-500', textColor: 'text-red-400' },
                { label: 'Жиры', value: todayMacros.fat, color: 'bg-amber-500', textColor: 'text-amber-400' },
                { label: 'Углеводы', value: todayMacros.carbs, color: 'bg-blue-500', textColor: 'text-blue-400' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${m.color}`} />
                  <span className="text-sm text-slate-400">{m.label}</span>
                  <span className={`text-sm font-semibold ml-auto ${m.textColor}`}>{m.value} г</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Calories Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> Калории за неделю
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="calories" fill="#10b981" radius={[6, 6, 0, 0]} name="Калории" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weight Trend */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" /> Динамика веса
          </h3>
          {weightData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              Нет данных о весе. Добавьте вес в профиле.
            </p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Вес (кг)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weekly Macros */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> БЖУ за неделю
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="protein" fill="#ef4444" radius={[4, 4, 0, 0]} name="Белки" stackId="a" />
                <Bar dataKey="fat" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Жиры" stackId="a" />
                <Bar dataKey="carbs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Углеводы" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <ShareStatsModal open={shareOpen} onOpenChange={setShareOpen} mode="weekly" />
    </AppLayout>
  );
}