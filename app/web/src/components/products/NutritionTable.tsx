interface Nutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  salt?: number;
}

interface NutritionTableProps {
  nutrition: Nutrition;
}

const ROWS: { key: keyof Nutrition; label: string; unit: string; color: string; format?: (v: number) => string }[] = [
  { key: 'calories', label: 'Калории', unit: 'ккал', color: 'text-orange-400', format: (v) => Math.round(v).toString() },
  { key: 'protein', label: 'Белки', unit: 'г', color: 'text-red-400' },
  { key: 'fat', label: 'Жиры', unit: 'г', color: 'text-amber-400' },
  { key: 'carbs', label: 'Углеводы', unit: 'г', color: 'text-blue-400' },
  { key: 'fiber', label: 'Клетчатка', unit: 'г', color: 'text-green-400' },
  { key: 'sugar', label: 'Сахар', unit: 'г', color: 'text-pink-400' },
  { key: 'sodium', label: 'Натрий', unit: 'мг', color: 'text-slate-300', format: (v) => (v * 1000).toFixed(0) },
  { key: 'salt', label: 'Соль', unit: 'г', color: 'text-slate-300' },
];

export default function NutritionTable({ nutrition }: NutritionTableProps) {
  const visibleRows = ROWS.filter((r) => nutrition[r.key] != null);

  if (visibleRows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800/50 overflow-hidden">
      <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800/50">
        <h3 className="text-sm font-semibold text-white">
          Пищевая ценность на 100 г
        </h3>
      </div>
      <div className="divide-y divide-slate-800/30">
        {visibleRows.map((row) => {
          const value = nutrition[row.key]!;
          const formatted = row.format ? row.format(value) : value.toFixed(1);
          return (
            <div
              key={row.key}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/20 transition-colors"
            >
              <span className="text-sm text-slate-400">{row.label}</span>
              <span className={`text-sm font-medium ${row.color}`}>
                {formatted} {row.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
