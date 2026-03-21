import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { calculateTargets, type UserParams } from '@/lib/nutrition-calc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ONBOARDING_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1042541/2026-03-20/3b2a1b64-b886-4070-a982-d2e4fb0a9453.png';

const STEPS = [
  'Пол и возраст',
  'Рост и вес',
  'Цели',
  'Предпочтения',
  'Образ жизни',
];

const ALLERGIES_OPTIONS = [
  'Глютен', 'Лактоза', 'Орехи', 'Морепродукты', 'Яйца', 'Соя',
];

const CUISINE_OPTIONS = [
  'Русская', 'Грузинская', 'Узбекская', 'Итальянская', 'Японская', 'Средиземноморская',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gender: 'male',
    age: 30,
    height_cm: 175,
    weight_kg: 80,
    target_weight_kg: 75,
    goal: 'lose',
    activity_level: 'moderate',
    allergies: [] as string[],
    cuisine_preferences: [] as string[],
    budget_per_week: 3000,
    city: 'Москва',
    cooking_time_minutes: 30,
  });

  const updateForm = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'allergies' | 'cuisine_preferences', item: string) => {
    setForm((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const targets = calculateTargets(form as UserParams);
      await client.entities.user_profiles.create({
        data: {
          gender: form.gender,
          age: form.age,
          height_cm: form.height_cm,
          weight_kg: form.weight_kg,
          target_weight_kg: form.target_weight_kg,
          goal: form.goal,
          activity_level: form.activity_level,
          allergies: form.allergies.join(','),
          cuisine_preferences: form.cuisine_preferences.join(','),
          budget_per_week: form.budget_per_week,
          city: form.city,
          cooking_time_minutes: form.cooking_time_minutes,
          target_calories: targets.calories,
          target_protein: targets.protein,
          target_fat: targets.fat,
          target_carbs: targets.carbs,
          onboarding_completed: true,
        },
      });
      toast.success('Профиль создан! Добро пожаловать в NutriAI');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения профиля';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-3 block">Пол</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'male', label: '👨 Мужской' },
                  { value: 'female', label: '👩 Женский' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateForm('gender', opt.value)}
                    className={`p-4 rounded-xl border text-center font-medium transition-all ${
                      form.gender === opt.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Возраст</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => updateForm('age', parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                min={14}
                max={100}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-2 block">Рост (см)</Label>
              <Input
                type="number"
                value={form.height_cm}
                onChange={(e) => updateForm('height_cm', parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                min={100}
                max={250}
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Текущий вес (кг)</Label>
              <Input
                type="number"
                value={form.weight_kg}
                onChange={(e) => updateForm('weight_kg', parseFloat(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                min={30}
                max={300}
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Целевой вес (кг)</Label>
              <Input
                type="number"
                value={form.target_weight_kg}
                onChange={(e) => updateForm('target_weight_kg', parseFloat(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                min={30}
                max={300}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-3 block">Цель</Label>
              <div className="space-y-3">
                {[
                  { value: 'lose', label: '🔥 Похудеть', desc: 'Дефицит 500 ккал/день' },
                  { value: 'maintain', label: '⚖️ Поддержать вес', desc: 'Сбалансированное питание' },
                  { value: 'gain', label: '💪 Набрать массу', desc: 'Профицит 300 ккал/день' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateForm('goal', opt.value)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      form.goal === opt.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-medium text-white">{opt.label}</div>
                    <div className="text-sm text-slate-400 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Уровень активности</Label>
              <Select value={form.activity_level} onValueChange={(v) => updateForm('activity_level', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Сидячий образ жизни</SelectItem>
                  <SelectItem value="light">Лёгкая активность (1-2 тренировки/нед)</SelectItem>
                  <SelectItem value="moderate">Умеренная (3-4 тренировки/нед)</SelectItem>
                  <SelectItem value="active">Высокая (5-6 тренировок/нед)</SelectItem>
                  <SelectItem value="very_active">Очень высокая (ежедневно)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-3 block">Аллергии и ограничения</Label>
              <div className="flex flex-wrap gap-2">
                {ALLERGIES_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleArrayItem('allergies', a)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      form.allergies.includes(a)
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-3 block">Предпочтения кухни</Label>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleArrayItem('cuisine_preferences', c)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      form.cuisine_preferences.includes(c)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-slate-300 mb-2 block">Бюджет на еду (₽/неделя)</Label>
              <Input
                type="number"
                value={form.budget_per_week}
                onChange={(e) => updateForm('budget_per_week', parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                min={500}
                step={500}
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Город</Label>
              <Input
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                placeholder="Москва"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Время на готовку (минут)</Label>
              <Select
                value={String(form.cooking_time_minutes)}
                onValueChange={(v) => updateForm('cooking_time_minutes', parseInt(v))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">До 15 минут</SelectItem>
                  <SelectItem value="30">До 30 минут</SelectItem>
                  <SelectItem value="45">До 45 минут</SelectItem>
                  <SelectItem value="60">До 1 часа</SelectItem>
                  <SelectItem value="90">Более 1 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Preview targets */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Ваши цели КБЖУ:
              </p>
              {(() => {
                const t = calculateTargets(form as UserParams);
                return (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-300">Калории: <span className="text-white font-semibold">{t.calories} ккал</span></div>
                    <div className="text-slate-300">Белки: <span className="text-white font-semibold">{t.protein} г</span></div>
                    <div className="text-slate-300">Жиры: <span className="text-white font-semibold">{t.fat} г</span></div>
                    <div className="text-slate-300">Углеводы: <span className="text-white font-semibold">{t.carbs} г</span></div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top image */}
      <div className="relative h-48 overflow-hidden">
        <img src={ONBOARDING_IMG} alt="Онбординг" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  i <= step ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="mb-2">
          <span className="text-sm text-emerald-400 font-medium">
            Шаг {step + 1} из {STEPS.length}
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-6">{STEPS[step]}</h2>

        {renderStep()}

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pb-8">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Назад
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              Далее <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              {saving ? 'Сохранение...' : (
                <>Завершить <Check className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}