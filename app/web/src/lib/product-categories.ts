export const PRODUCT_CATEGORIES = [
  { value: 'grains',     label: 'Крупы и злаки' },
  { value: 'meat',       label: 'Мясо и птица' },
  { value: 'dairy',      label: 'Молочные продукты' },
  { value: 'fish',       label: 'Рыба и морепродукты' },
  { value: 'vegetables', label: 'Овощи' },
  { value: 'fruits',     label: 'Фрукты' },
  { value: 'legumes',    label: 'Бобовые' },
  { value: 'bakery',     label: 'Хлеб и выпечка' },
  { value: 'snacks',     label: 'Снеки и сладкое' },
  { value: 'beverages',  label: 'Напитки' },
  { value: 'oils',       label: 'Масла и жиры' },
  { value: 'other',      label: 'Другое' },
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number]['value'];

export function getCategoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
