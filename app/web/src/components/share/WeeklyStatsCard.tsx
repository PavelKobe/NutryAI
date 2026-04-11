import { forwardRef } from 'react';

interface WeeklyStatsCardProps {
  dateRange: string;
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  weightChange: { startWeight: number; endWeight: number; change: number } | null;
  streak: number;
  daysWithData: number;
}

const StatBox = ({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) => (
  <div style={{ textAlign: 'center', flex: 1 }}>
    <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' }}>{value}</div>
    <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'sans-serif' }}>{unit}</div>
    <div style={{ color: '#64748b', fontSize: 11, marginTop: 2, fontFamily: 'sans-serif' }}>{label}</div>
  </div>
);

const WeeklyStatsCard = forwardRef<HTMLDivElement, WeeklyStatsCardProps>(
  ({ dateRange, avgCalories, avgProtein, avgFat, avgCarbs, weightChange, streak, daysWithData }, ref) => (
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
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>{dateRange}</div>

      {/* Title */}
      <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 16, fontFamily: 'sans-serif' }}>
        Средние показатели за неделю
      </div>

      {/* Avg Calories */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ color: '#f8fafc', fontSize: 48, fontWeight: 700, fontFamily: 'sans-serif' }}>{avgCalories}</div>
        <div style={{ color: '#64748b', fontSize: 14, fontFamily: 'sans-serif' }}>ккал / день</div>
      </div>

      {/* Macros grid */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: '16px 0', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <StatBox label="Белки" value={avgProtein} unit="г" color="#ef4444" />
        <StatBox label="Жиры" value={avgFat} unit="г" color="#f59e0b" />
        <StatBox label="Углеводы" value={avgCarbs} unit="г" color="#3b82f6" />
      </div>

      {/* Weight change */}
      {weightChange && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d={weightChange.change <= 0 ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'}
              stroke={weightChange.change <= 0 ? '#22c55e' : '#ef4444'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ color: weightChange.change <= 0 ? '#22c55e' : '#ef4444', fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif' }}>
            {weightChange.change > 0 ? '+' : ''}{weightChange.change} кг
          </span>
          <span style={{ color: '#64748b', fontSize: 13, fontFamily: 'sans-serif' }}>за неделю</span>
        </div>
      )}

      {/* Streak + Days */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 23c-3.6 0-7-2.4-7-7 0-3.2 2.7-6.4 5-8.8l2 2c-1.5 1.6-3 3.8-3 5.8 0 2.5 1.4 4 3 4s3-1.5 3-4c0-1.5-.6-2.8-1.4-4l1.5-1.5C17.3 11.6 19 14.3 19 16c0 4.6-3.4 7-7 7z" />
            </svg>
            <span style={{ color: '#f8fafc', fontSize: 16, fontWeight: 600, fontFamily: 'sans-serif' }}>{streak}</span>
            <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'sans-serif' }}>
              {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'sans-serif' }}>{daysWithData} из 7 дней</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <span style={{ color: '#15803d', fontSize: 13, fontWeight: 600, fontFamily: 'sans-serif' }}>nutriaidiary.com</span>
      </div>
    </div>
  )
);

WeeklyStatsCard.displayName = 'WeeklyStatsCard';
export default WeeklyStatsCard;
