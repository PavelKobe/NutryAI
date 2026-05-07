/**
 * Парсер строкового количества из Shopping List («600г», «1.5 кг», «500мл», «3 шт»).
 *
 * Для жидкостей мл/л считаем 1 мл ≈ 1 г (вода и подобные) — для
 * накопления в `stock_grams` это разумная апроксимация. Если нужна
 * точность по плотности — в будущем добавим коэффициент по категории.
 */

export interface ParsedAmount {
  /** Граммы, если единицу удалось интерпретировать как массу/объём. null для шт/упаковок. */
  grams: number | null;
  /** Оригинальное число (для отображения). */
  amount: number;
  /** Оригинальная единица из строки (нормализованная). */
  unit: string;
}

const RE = /^\s*(\d+(?:[.,]\d+)?)\s*([^\s\d.,]+)\s*$/i;

const GRAM_UNITS = new Set([
  'г', 'гр', 'грамм', 'граммы', 'граммов', 'g', 'gr', 'gram', 'grams',
]);
const KG_UNITS = new Set(['кг', 'kg', 'kilo', 'kilogram', 'kilograms']);
const ML_UNITS = new Set(['мл', 'ml', 'milliliter', 'milliliters']);
const L_UNITS = new Set(['л', 'литр', 'литра', 'литров', 'l', 'liter', 'liters']);

/**
 * Возвращает {grams, amount, unit}.
 * Если строка не парсится — {grams: null, amount: 0, unit: исходная строка}.
 */
export function parseAmount(input: string | null | undefined): ParsedAmount {
  if (!input) return { grams: null, amount: 0, unit: '' };
  const m = input.match(RE);
  if (!m) {
    return { grams: null, amount: 0, unit: input.trim() };
  }
  const num = parseFloat(m[1].replace(',', '.'));
  if (Number.isNaN(num)) {
    return { grams: null, amount: 0, unit: m[2].toLowerCase() };
  }
  const unit = m[2].toLowerCase();

  if (GRAM_UNITS.has(unit)) return { grams: num, amount: num, unit: 'г' };
  if (KG_UNITS.has(unit)) return { grams: num * 1000, amount: num, unit: 'кг' };
  if (ML_UNITS.has(unit)) return { grams: num, amount: num, unit: 'мл' };
  if (L_UNITS.has(unit)) return { grams: num * 1000, amount: num, unit: 'л' };

  // шт, пачк*, уп* и любые другие — без накопления массы
  return { grams: null, amount: num, unit };
}

/** Нормализует имя для match'а с user_products (lowercase + trim). */
export function normalizeProductName(name: string): string {
  return (name || '').toLowerCase().trim();
}

/** Форматирует grams для toast: «+600 г» / «+1.5 кг». */
export function formatGrams(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `+${Number.isInteger(kg) ? kg : kg.toFixed(2)} кг`;
  }
  return `+${Math.round(grams)} г`;
}

/** Форматирует stock_grams для отображения в карточке товара: «600 г» / «1.5 кг». */
export function formatStock(grams: number | null | undefined): string {
  if (!grams || grams <= 0) return '';
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2)} кг`;
  }
  return `${Math.round(grams)} г`;
}
