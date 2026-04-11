import { forwardRef } from 'react';

interface DailyStatsCardProps {
  date: string;
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  fat: number;
  targetFat: number;
  carbs: number;
  targetCarbs: number;
  waterMl: number;
  targetWaterMl: number;
  mealsCount: number;
}

const CalorieRing = ({ value, target }: { value: number; target: number }) => {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#15803d"
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="62" textAnchor="middle" fill="#f8fafc" fontSize="24" fontWeight="700" fontFamily="sans-serif">
        {value}
      </text>
      <text x="70" y="82" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">
        / {target} ккал
      </text>
    </svg>
  );
};

const MacroBar = ({ label, value, target, color }: { label: string; value: number; target: number; color: string }) => {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#cbd5e1', fontSize: 13, fontFamily: 'sans-serif' }}>{label}</span>
        <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'sans-serif' }}>{value}г / {target}г</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, backgroundColor: '#1e293b' }}>
        <div style={{ height: 8, borderRadius: 4, backgroundColor: color, width: `${pct}%` }} />
      </div>
    </div>
  );
};

const DailyStatsCard = forwardRef<HTMLDivElement, DailyStatsCardProps>(
  ({ date, calories, targetCalories, protein, targetProtein, fat, targetFat, carbs, targetCarbs, waterMl, targetWaterMl, mealsCount }, ref) => (
    <div
      ref={ref}
      style={{
        width: 400,
        height: 560,
        backgroundColor: '#0f172a',
        padding: '28px 28px 20px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#15803d" />
          <path fill="#bbf7d0" d="M16 5c-5 9-5 16 0 22 5-6 5-13 0-22zm0 22c-2-3-3-7-3-11 0-4 1-8 3-11 2 3 3 7 3 11 0 4-1 8-3 11z" />
        </svg>
        <span style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>NutriAI Diary</span>
      </div>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{date}</div>

      {/* Calorie Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <CalorieRing value={calories} target={targetCalories} />
      </div>

      {/* Macros */}
      <MacroBar label="Белки" value={protein} target={targetProtein} color="#ef4444" />
      <MacroBar label="Жиры" value={fat} target={targetFat} color="#f59e0b" />
      <MacroBar label="Углеводы" value={carbs} target={targetCarbs} color="#3b82f6" />

      {/* Water + Meals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, padding: '12px 0', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span style={{ color: '#cbd5e1', fontSize: 14, fontFamily: 'sans-serif' }}>
            {waterMl} / {targetWaterMl} мл
          </span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'sans-serif' }}>
          {mealsCount} {mealsCount === 1 ? 'приём' : mealsCount < 5 ? 'приёма' : 'приёмов'} пищи
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <span style={{ color: '#15803d', fontSize: 13, fontWeight: 600, fontFamily: 'sans-serif' }}>nutriaidiary.com</span>
      </div>
    </div>
  )
);

DailyStatsCard.displayName = 'DailyStatsCard';
export default DailyStatsCard;
