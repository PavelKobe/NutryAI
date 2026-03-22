'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import { client } from '@/lib/api';
import { getAPIBaseURL } from '@/lib/config';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Pencil, Sparkles, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET_NAME = 'colorio-image';
const PHOTO_RETENTION_DAYS = 7;

interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion_grams: number;
}

/**
 * Upload a photo file to Storage via presigned URL.
 * Returns { photoUrl, objectKey } on success.
 */
async function uploadPhotoToStorage(
  file: File,
  userId: string,
): Promise<{ photoUrl: string; objectKey: string }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '-');
  const ts = Date.now();
  const objectKey = `${userId}/${today}/${ts}-${safeName}`;

  // 1. Get presigned upload URL from backend
  const res = await axios.post(
    `${getAPIBaseURL()}/api/v1/storage/upload-url`,
    {
      bucket_name: BUCKET_NAME,
      object_key: objectKey,
    },
    { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
  );

  const uploadUrl: string = res?.data?.upload_url;
  if (!uploadUrl) {
    throw new Error('Не удалось получить URL для загрузки');
  }

  // 2. Upload file directly to Storage via presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
  });

  if (!uploadRes.ok) {
    throw new Error(`Ошибка загрузки файла: ${uploadRes.status}`);
  }

  // 3. Get download URL (public access URL)
  const dlRes = await axios.post(
    `${getAPIBaseURL()}/api/v1/storage/download-url`,
    {
      bucket_name: BUCKET_NAME,
      object_key: objectKey,
    },
    { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
  );

  const downloadUrl: string = dlRes?.data?.download_url;
  if (!downloadUrl) {
    throw new Error('Не удалось получить URL фото');
  }

  return { photoUrl: downloadUrl, objectKey };
}

export default function AddFood() {
  const [mode, setMode] = useState<'choose' | 'camera' | 'manual'>('choose');
  const [mealType, setMealType] = useState('lunch');
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<RecognizedFood | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manual, setManual] = useState({
    food_name: '',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    portion_grams: 100,
  });

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store file for later upload
    setPhotoFile(file);

    // Show local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Recognize food via AI
    setRecognizing(true);
    setMode('camera');
    try {
      const base64Reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        base64Reader.onload = () => resolve(base64Reader.result as string);
        base64Reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      const result = await client.ai.gentxt({
        messages: [
          {
            role: 'system',
            content: `Ты — эксперт по нутрициологии. Проанализируй фото и определи блюдо.
Обязательно визуально оцени размер порции в граммах и рассчитай КБЖУ ИМЕННО для этого веса порции, а не на 100г.
Учти метод приготовления, масло, соусы и другие скрытые калории.
Ответь ТОЛЬКО валидным JSON без markdown:
{"name":"Название блюда на русском","calories":350,"protein":20,"fat":12,"carbs":40,"portion_grams":250}
Если не можешь определить — верни {"name":"Неизвестное блюдо","calories":200,"protein":10,"fat":8,"carbs":25,"portion_grams":200}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Определи это блюдо и его КБЖУ:' },
              { type: 'image_url', image_url: { url: base64 } },
            ],
          },
        ],
        model: 'openai/gpt-4o',
        stream: false,
      });
      const rawText = (result as { data?: { content?: string } })?.data?.content || '';
      try {
        let jsonStr = rawText.trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        const parsed: RecognizedFood = JSON.parse(jsonStr);
        setRecognized(parsed);
        toast.success(`Распознано: ${parsed.name}`);
      } catch {
        toast.error('Не удалось распознать блюдо');
      }
    } catch {
      toast.error('Ошибка при обработке фото');
    } finally {
      setRecognizing(false);
    }
  };

  const saveMealLog = async (food: RecognizedFood | typeof manual & { food_name?: string }) => {
    setSaving(true);
    try {
      const name = 'food_name' in food ? food.food_name : ('name' in food ? food.name : 'Неизвестно');

      let photoUrl = '';
      let photoObjectKey = '';

      // Upload photo to Storage if we have a file
      if (photoFile) {
        try {
          // Get current user info for the path
          const userRes = await axios.get(`${getAPIBaseURL()}/api/v1/auth/me`, {
            withCredentials: true,
          });
          const userId = userRes?.data?.id || 'anonymous';
          const result = await uploadPhotoToStorage(photoFile, userId);
          photoUrl = result.photoUrl;
          photoObjectKey = result.objectKey;
        } catch (err) {
          console.error('Photo upload failed, saving without photo:', err);
          toast.warning('Фото не удалось загрузить, сохраняем без фото');
        }
      }

      // Calculate photo_kept_until (7 days from now)
      const photoKeptUntil = photoObjectKey
        ? new Date(Date.now() + PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await client.entities.meal_logs.create({
        data: {
          meal_type: mealType,
          food_name: name || 'Неизвестно',
          calories: food.calories || 0,
          protein: food.protein || 0,
          fat: food.fat || 0,
          carbs: food.carbs || 0,
          portion_grams: food.portion_grams || 100,
          photo_url: photoUrl || '',
          photo_object_key: photoObjectKey || '',
          photo_kept_until: photoKeptUntil,
          logged_at: new Date().toISOString(),
        },
      });
      toast.success('Еда добавлена в дневник!');
      // Reset
      setRecognized(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      setMode('choose');
      setManual({ food_name: '', calories: 0, protein: 0, fat: 0, carbs: 0, portion_grams: 100 });
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Добавить еду">
      <div className="space-y-5">
        {/* Meal Type Selector */}
        <div>
          <Label className="text-slate-300 mb-2 block text-sm">Приём пищи</Label>
          <div className="flex gap-2">
            {[
              { value: 'breakfast', label: '🌅 Завтрак' },
              { value: 'lunch', label: '☀️ Обед' },
              { value: 'dinner', label: '🌙 Ужин' },
              { value: 'snack', label: '🍎 Перекус' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setMealType(t.value)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                  mealType === t.value
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            {/* Photo option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Сфотографировать еду</p>
                  <p className="text-sm text-slate-400 mt-1">
                    ИИ распознает блюдо и определит КБЖУ за 3 секунды
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-400 ml-auto flex-shrink-0" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {/* Manual option */}
            <button
              onClick={() => setMode('manual')}
              className="w-full p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Pencil className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Ввести вручную</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Укажите название, калории и БЖУ самостоятельно
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Camera / Recognition Result */}
        {mode === 'camera' && (
          <div className="space-y-4">
            {photoPreview && (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={photoPreview} alt="Фото еды" className="w-full aspect-video object-cover" />
                {recognizing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-2" />
                      <p className="text-white font-medium">ИИ анализирует фото...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {recognized && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Результат распознавания
                </h3>
                <p className="text-lg font-bold text-white mb-3">{recognized.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400">Калории:</span>{' '}
                    <span className="text-white font-semibold">{recognized.calories} ккал</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400">Порция:</span>{' '}
                    <span className="text-white font-semibold">{recognized.portion_grams} г</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400">Белки:</span>{' '}
                    <span className="text-white font-semibold">{recognized.protein} г</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400">Жиры:</span>{' '}
                    <span className="text-white font-semibold">{recognized.fat} г</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/50 col-span-2">
                    <span className="text-slate-400">Углеводы:</span>{' '}
                    <span className="text-white font-semibold">{recognized.carbs} г</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => saveMealLog(recognized)}
                    disabled={saving}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    {saving ? 'Загрузка фото...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setMode('choose'); setRecognized(null); setPhotoPreview(null); setPhotoFile(null); }}
                    className="border-slate-700 text-slate-300 rounded-xl"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry */}
        {mode === 'manual' && (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">Название блюда</Label>
              <Input
                value={manual.food_name}
                onChange={(e) => setManual({ ...manual, food_name: e.target.value })}
                placeholder="Например: Гречка с курицей"
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 mb-2 block text-sm">Калории (ккал)</Label>
                <Input
                  type="number"
                  value={manual.calories || ''}
                  onChange={(e) => setManual({ ...manual, calories: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block text-sm">Порция (г)</Label>
                <Input
                  type="number"
                  value={manual.portion_grams || ''}
                  onChange={(e) => setManual({ ...manual, portion_grams: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block text-sm">Белки (г)</Label>
                <Input
                  type="number"
                  value={manual.protein || ''}
                  onChange={(e) => setManual({ ...manual, protein: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block text-sm">Жиры (г)</Label>
                <Input
                  type="number"
                  value={manual.fat || ''}
                  onChange={(e) => setManual({ ...manual, fat: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-300 mb-2 block text-sm">Углеводы (г)</Label>
                <Input
                  type="number"
                  value={manual.carbs || ''}
                  onChange={(e) => setManual({ ...manual, carbs: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => saveMealLog(manual)}
                disabled={saving || !manual.food_name}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Сохранить
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('choose')}
                className="border-slate-700 text-slate-300 rounded-xl"
              >
                Отмена
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}