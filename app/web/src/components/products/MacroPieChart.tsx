'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MacroPieChartProps {
  protein: number;
  fat: number;
  carbs: number;
}

const COLORS = {
  protein: '#f87171', // red-400
  fat: '#fbbf24',     // amber-400
  carbs: '#60a5fa',   // blue-400
};

const LABELS: Record<string, string> = {
  protein: 'Белки',
  fat: 'Жиры',
  carbs: 'Углеводы',
};

export default function MacroPieChart({ protein, fat, carbs }: MacroPieChartProps) {
  const total = protein + fat + carbs;
  if (total === 0) return null;

  const data = [
    { name: 'protein', value: protein, label: LABELS.protein },
    { name: 'fat', value: fat, label: LABELS.fat },
    { name: 'carbs', value: carbs, label: LABELS.carbs },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-slate-800/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Соотношение БЖУ</h3>

      <div className="flex items-center gap-4">
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} г`,
                  LABELS[name] || name,
                ]}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2">
          {data.map((entry) => {
            const pct = ((entry.value / total) * 100).toFixed(0);
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] }}
                />
                <span className="text-xs text-slate-400">{entry.label}</span>
                <span className="text-xs font-medium text-white">
                  {entry.value.toFixed(1)} г
                </span>
                <span className="text-xs text-slate-500">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
