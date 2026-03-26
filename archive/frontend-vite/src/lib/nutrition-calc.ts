// Mifflin-St Jeor equation for BMR calculation
// Расчёт КБЖУ по формуле Миффлина-Сан Жеора

export interface UserParams {
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal: 'lose' | 'gain' | 'maintain';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTargets(params: UserParams): NutritionTargets {
  const bmr = calculateBMR(params.gender, params.weight_kg, params.height_cm, params.age);
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[params.activity_level] || 1.55);

  let targetCalories: number;
  switch (params.goal) {
    case 'lose':
      targetCalories = tdee - 500;
      break;
    case 'gain':
      targetCalories = tdee + 300;
      break;
    default:
      targetCalories = tdee;
  }

  targetCalories = Math.max(1200, Math.round(targetCalories));

  const targetWeight = params.target_weight_kg || params.weight_kg;
  const protein = Math.round(2.0 * targetWeight);
  const fat = Math.round(0.8 * targetWeight);
  const carbs = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

  return {
    calories: targetCalories,
    protein: Math.max(protein, 50),
    fat: Math.max(fat, 30),
    carbs: Math.max(carbs, 50),
  };
}

export function formatCalories(value: number): string {
  return `${Math.round(value)} ккал`;
}

export function formatGrams(value: number): string {
  return `${Math.round(value)} г`;
}

export function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}