'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { mealLogsTodayQueryKey } from '@/lib/queries/meal_logs_today';
import { calculateTargets, type UserParams } from '@/lib/nutrition-calc';
import AppLayout from '@/components/layout/AppLayout';
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
import {
  User,
  Scale,
  Target,
  Utensils,
  Save,
  Loader2,
  Plus,
  Pencil,
  X,
  Sparkles,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import UpgradeSubscriptionModal from '@/components/subscription/UpgradeSubscriptionModal';

interface ProfileData {
  id: number | string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal: string;
  activity_level: string;
  allergies: string;
  cuisine_preferences: string;
  budget_per_week: number;
  city: string;
  cooking_time_minutes: number;
  target_calories: number;
  target_protein: number;
  target_fat: number;
  target_carbs: number;
  [key: string]: unknown; // allow extra fields like _id, entity_id, etc.
}

const GOAL_LABELS: Record<string, string> = {
  lose: '🔥 Похудеть',
  maintain: '⚖️ Поддержать вес',
  gain: '💪 Набрать массу',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Сидячий',
  light: 'Лёгкая',
  moderate: 'Умеренная',
  active: 'Высокая',
  very_active: 'Очень высокая',
};

const ALLERGIES_OPTIONS = [
  'Глютен', 'Лактоза', 'Орехи', 'Морепродукты', 'Яйца', 'Соя',
];

const CUISINE_OPTIONS = [
  'Русская', 'Грузинская', 'Узбекская', 'Итальянская', 'Японская', 'Средиземноморская',
];

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { subscription } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Editable form state
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
    city: '',
    cooking_time_minutes: 30,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const getProfileId = (p: ProfileData): string => {
    // Try common ID field names the backend might return
    const candidate = p.id ?? (p as Record<string, unknown>)._id ?? (p as Record<string, unknown>).entity_id;
    return String(candidate);
  };

  const loadProfile = async () => {
    try {
      const res = await client.entities.user_profiles.query({ limit: 1 });
      const data = res?.data;
      // Support both { items: [...] } and direct array responses
      const profiles = Array.isArray(data) ? data : (data?.items || []);
      if (profiles.length > 0) {
        const p = profiles[0] as ProfileData;
        console.log('[Profile] loaded profile:', JSON.stringify(p));
        setProfile(p);
        setWeightInput(String(p.weight_kg || ''));
        syncFormFromProfile(p);
      } else {
        router.push('/onboarding');
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncFormFromProfile = (p: ProfileData) => {
    setForm({
      gender: p.gender || 'male',
      age: p.age || 30,
      height_cm: p.height_cm || 175,
      weight_kg: p.weight_kg || 80,
      target_weight_kg: p.target_weight_kg || 75,
      goal: p.goal || 'lose',
      activity_level: p.activity_level || 'moderate',
      allergies: p.allergies ? p.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      cuisine_preferences: p.cuisine_preferences ? p.cuisine_preferences.split(',').map((s) => s.trim()).filter(Boolean) : [],
      budget_per_week: p.budget_per_week || 3000,
      city: p.city || '',
      cooking_time_minutes: p.cooking_time_minutes || 30,
    });
  };

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

  const startEditing = () => {
    if (profile) {
      syncFormFromProfile(profile);
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    if (profile) {
      syncFormFromProfile(profile);
    }
    setEditing(false);
  };

  const previewTargets = calculateTargets(form as UserParams);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const targets = calculateTargets(form as UserParams);
      const weightChanged = form.weight_kg !== profile.weight_kg;
      const profileId = getProfileId(profile);

      await client.entities.user_profiles.update({
        id: profileId,
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
        },
      });

      // Log weight change to weight_logs
      if (weightChanged) {
        try {
          await client.entities.weight_logs.create({
            data: {
              weight_kg: form.weight_kg,
              logged_at: new Date().toISOString(),
            },
          });
        } catch {
          console.warn('Failed to log weight change');
        }
      }

      // Invalidate all related queries for sync across pages
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
      void queryClient.invalidateQueries({ queryKey: [...mealLogsTodayQueryKey] });
      void queryClient.refetchQueries({ queryKey: [...mealLogsTodayQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['meal_logs_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['weight_logs'] });

      // Update local state
      const updatedProfile: ProfileData = {
        ...profile,
        ...form,
        allergies: form.allergies.join(','),
        cuisine_preferences: form.cuisine_preferences.join(','),
        target_calories: targets.calories,
        target_protein: targets.protein,
        target_fat: targets.fat,
        target_carbs: targets.carbs,
      };
      setProfile(updatedProfile);
      setWeightInput(String(form.weight_kg));
      setEditing(false);
      toast.success('Профиль обновлён! КБЖУ пересчитаны.');
    } catch {
      toast.error('Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 30 || w > 300) {
      toast.error('Введите корректный вес (30-300 кг)');
      return;
    }
    setSavingWeight(true);
    try {
      await client.entities.weight_logs.create({
        data: {
          weight_kg: w,
          logged_at: new Date().toISOString(),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['weight_logs'] });
      toast.success(`Вес ${w} кг записан!`);
    } catch {
      toast.error('Ошибка записи веса');
    } finally {
      setSavingWeight(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Профиль">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout title="Профиль">
      <div className="space-y-5">
        {/* Profile Card / Edit Mode */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              {!editing && (
                <div>
                  <p className="text-lg font-bold">{profile.gender === 'male' ? '👨' : '👩'} {profile.city || 'Пользователь'}</p>
                  <p className="text-sm text-slate-400">
                    {profile.age} лет • {profile.height_cm} см • {profile.weight_kg} кг
                  </p>
                </div>
              )}
            </div>
            {!editing ? (
              <Button
                onClick={startEditing}
                size="sm"
                variant="ghost"
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
              >
                <Pencil className="w-4 h-4 mr-1" /> Редактировать
              </Button>
            ) : (
              <Button
                onClick={cancelEditing}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-4 h-4 mr-1" /> Отмена
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-5">
              {/* Gender */}
              <div>
                <Label className="text-slate-300 mb-2 block">Пол</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'male', label: '👨 Мужской' },
                    { value: 'female', label: '👩 Женский' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateForm('gender', opt.value)}
                      className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
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

              {/* Age */}
              <div>
                <Label className="text-slate-300 mb-2 block">Возраст</Label>
                <Input
                  type="number"
                  value={form.age === 0 ? '' : form.age}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateForm('age', v === '' ? 0 : parseInt(v, 10) || 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                  min={14}
                  max={100}
                />
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 mb-2 block">Рост (см)</Label>
                  <Input
                    type="number"
                    value={form.height_cm === 0 ? '' : form.height_cm}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateForm('height_cm', v === '' ? 0 : parseInt(v, 10) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="bg-slate-800 border-slate-700 text-white rounded-xl"
                    min={100}
                    max={250}
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">Вес (кг)</Label>
                  <Input
                    type="number"
                    value={form.weight_kg === 0 ? '' : form.weight_kg}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateForm('weight_kg', v === '' ? 0 : parseFloat(v) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="bg-slate-800 border-slate-700 text-white rounded-xl"
                    min={30}
                    max={300}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Target Weight */}
              <div>
                <Label className="text-slate-300 mb-2 block">Целевой вес (кг)</Label>
                <Input
                  type="number"
                  value={form.target_weight_kg === 0 ? '' : form.target_weight_kg}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateForm('target_weight_kg', v === '' ? 0 : parseFloat(v) || 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                  min={30}
                  max={300}
                  step={0.1}
                />
              </div>

              {/* Goal */}
              <div>
                <Label className="text-slate-300 mb-2 block">Цель</Label>
                <div className="space-y-2">
                  {[
                    { value: 'lose', label: '🔥 Похудеть', desc: 'Дефицит 500 ккал/день' },
                    { value: 'maintain', label: '⚖️ Поддержать вес', desc: 'Сбалансированное питание' },
                    { value: 'gain', label: '💪 Набрать массу', desc: 'Профицит 300 ккал/день' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateForm('goal', opt.value)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        form.goal === opt.value
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{opt.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
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

              {/* Allergies */}
              <div>
                <Label className="text-slate-300 mb-2 block">Аллергии и ограничения</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleArrayItem('allergies', a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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

              {/* Cuisine Preferences */}
              <div>
                <Label className="text-slate-300 mb-2 block">Предпочтения кухни</Label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleArrayItem('cuisine_preferences', c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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

              {/* Budget */}
              <div>
                <Label className="text-slate-300 mb-2 block">Бюджет на еду (₽/неделя)</Label>
                <Input
                  type="number"
                  value={form.budget_per_week === 0 ? '' : form.budget_per_week}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateForm('budget_per_week', v === '' ? 0 : parseInt(v, 10) || 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                  min={500}
                  step={500}
                />
              </div>

              {/* City */}
              <div>
                <Label className="text-slate-300 mb-2 block">Город</Label>
                <Input
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                  placeholder="Москва"
                />
              </div>

              {/* Cooking Time */}
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

              {/* Live КБЖУ Preview */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4" /> Пересчитанные КБЖУ:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-300">Калории: <span className="text-white font-semibold">{previewTargets.calories} ккал</span></div>
                  <div className="text-slate-300">Белки: <span className="text-white font-semibold">{previewTargets.protein} г</span></div>
                  <div className="text-slate-300">Жиры: <span className="text-white font-semibold">{previewTargets.fat} г</span></div>
                  <div className="text-slate-300">Углеводы: <span className="text-white font-semibold">{previewTargets.carbs} г</span></div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Сохранить изменения</>
                )}
              </Button>
            </div>
          ) : (
            /* View Mode */
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/50">
                <span className="text-xs text-slate-500 block mb-1">Цель</span>
                <span className="text-sm font-medium">{GOAL_LABELS[profile.goal] || profile.goal}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <span className="text-xs text-slate-500 block mb-1">Активность</span>
                <span className="text-sm font-medium">{ACTIVITY_LABELS[profile.activity_level] || profile.activity_level}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <span className="text-xs text-slate-500 block mb-1">Целевой вес</span>
                <span className="text-sm font-medium">{profile.target_weight_kg} кг</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <span className="text-xs text-slate-500 block mb-1">Бюджет</span>
                <span className="text-sm font-medium">{profile.budget_per_week} ₽/нед</span>
              </div>
            </div>
          )}
        </div>

        {/* КБЖУ Targets (only in view mode) */}
        {!editing && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-400">
              <Target className="w-5 h-5" /> Целевые КБЖУ
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/50">
                <span className="text-xs text-slate-500 block">Калории</span>
                <span className="text-lg font-bold text-orange-400">{profile.target_calories} ккал</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50">
                <span className="text-xs text-slate-500 block">Белки</span>
                <span className="text-lg font-bold text-red-400">{profile.target_protein} г</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50">
                <span className="text-xs text-slate-500 block">Жиры</span>
                <span className="text-lg font-bold text-amber-400">{profile.target_fat} г</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50">
                <span className="text-xs text-slate-500 block">Углеводы</span>
                <span className="text-lg font-bold text-blue-400">{profile.target_carbs} г</span>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Card (only in view mode) */}
        {!editing && (
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Подписка
              </h3>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Обновить подписку
              </button>
            </div>
            {subscription ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-500 block mb-1">Тариф</span>
                  <span className="text-sm font-medium">{subscription.plan_name}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-500 block mb-1">Статус</span>
                  <span className={`text-sm font-medium ${subscription.is_expired ? 'text-red-400' : 'text-emerald-400'}`}>
                    {subscription.is_expired ? 'Истёк' : 'Активен'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-500 block mb-1">ИИ-запросы сегодня</span>
                  <span className="text-sm font-medium">
                    {subscription.ai_requests_today} / {subscription.daily_ai_limit}
                  </span>
                </div>
                {subscription.expires_at && (
                  <div className="p-3 rounded-xl bg-slate-800/50">
                    <span className="text-xs text-slate-500 block mb-1">Действует до</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Загрузка данных подписки...</p>
            )}
          </div>
        )}

        {/* Diet Info (only in view mode) */}
        {!editing && (
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-400" /> Предпочтения
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Аллергии</span>
                <div className="flex flex-wrap gap-1">
                  {profile.allergies ? (
                    profile.allergies.split(',').map((a) => (
                      <span key={a} className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                        {a.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">Нет</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">Кухни</span>
                <div className="flex flex-wrap gap-1">
                  {profile.cuisine_preferences ? (
                    profile.cuisine_preferences.split(',').map((c) => (
                      <span key={c} className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                        {c.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">Не указаны</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">Время на готовку</span>
                <span className="text-sm text-slate-300">До {profile.cooking_time_minutes} минут</span>
              </div>
            </div>
          </div>
        )}

        {/* Weight Logger */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" /> Записать вес
          </h3>
          <div className="flex gap-3">
            <Input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Вес в кг"
              className="bg-slate-800 border-slate-700 text-white rounded-xl"
              min={30}
              max={300}
              step={0.1}
            />
            <Button
              onClick={logWeight}
              disabled={savingWeight}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-6"
            >
              {savingWeight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            ⚠️ NutriAI не заменяет консультацию врача-диетолога. Перед изменением рациона 
            проконсультируйтесь со специалистом. Расчёты КБЖУ носят рекомендательный характер.
          </p>
        </div>
      </div>

      <UpgradeSubscriptionModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        trigger="manual"
      />
    </AppLayout>
  );
}