'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminGetCoachingPlan,
  adminPatchCoachingPlan,
  type AdminCoachingPlanPatch,
  type PlanFeature,
} from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function AdminCoachingPlanPage() {
  const qc = useQueryClient();
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formFeatures, setFormFeatures] = useState<PlanFeature[]>([]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['admin-coaching-plan'],
    queryFn: adminGetCoachingPlan,
  });

  useEffect(() => {
    if (!plan) return;
    setFormName(plan.name);
    setFormDescription(plan.description ?? '');
    setFormPrice(plan.price);
    setFormDuration(String(plan.duration_days));
    setFormActive(plan.is_active);
    setFormFeatures(plan.features ? [...plan.features] : []);
  }, [plan]);

  const patchMut = useMutation({
    mutationFn: (body: AdminCoachingPlanPatch) => adminPatchCoachingPlan(body),
    onSuccess: () => {
      toast.success('Карточка обновлена');
      void qc.invalidateQueries({ queryKey: ['admin-coaching-plan'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function save() {
    const body: AdminCoachingPlanPatch = {
      name: formName.trim() || undefined,
      description: formDescription.trim() ? formDescription : null,
      price: formPrice !== '' ? Number(formPrice) : undefined,
      duration_days: formDuration !== '' ? Number(formDuration) : undefined,
      is_active: formActive,
      features: formFeatures,
    };
    patchMut.mutate(body);
  }

  function addFeature() {
    setFormFeatures((prev) => [...prev, { text: '', included: true }]);
  }
  function removeFeature(idx: number) {
    setFormFeatures((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateFeatureText(idx: number, text: string) {
    setFormFeatures((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, text } : f))
    );
  }
  function toggleFeatureIncluded(idx: number, included: boolean) {
    setFormFeatures((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, included } : f))
    );
  }

  if (isLoading || !plan) {
    return <p className="text-slate-400">Загрузка…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">
        Карточка услуги: Сопровождение нутрициолога
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Edit form */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">
              Редактирование
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Название</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-slate-700 bg-slate-950"
              />
            </div>

            <div className="space-y-1">
              <Label>Описание (видно пользователю в модалке оплаты)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
                className="border-slate-700 bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Цена (₽)</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="border-slate-700 bg-slate-950"
                />
              </div>
              <div className="space-y-1">
                <Label>Срок (дней)</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="border-slate-700 bg-slate-950"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formActive}
                onCheckedChange={setFormActive}
                id="is_active"
              />
              <Label htmlFor="is_active">Услуга активна (показывается клиентам)</Label>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Что входит</Label>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={addFeature}
                >
                  + Добавить
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {formFeatures.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Switch
                      checked={f.included}
                      onCheckedChange={(v) => toggleFeatureIncluded(idx, v)}
                      className="shrink-0"
                    />
                    <Input
                      value={f.text}
                      onChange={(e) => updateFeatureText(idx, e.target.value)}
                      placeholder="Описание функции"
                      className="border-slate-700 bg-slate-950 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="text-slate-500 hover:text-red-400 px-2 shrink-0"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                {formFeatures.length === 0 && (
                  <p className="text-slate-500 text-sm">
                    Нет пунктов. Нажмите «+ Добавить».
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={save}
              disabled={patchMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Сохранить
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">Превью</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-1">{formName}</h3>
              <p className="text-sm text-slate-400 whitespace-pre-line mb-3">
                {formDescription}
              </p>
              <div className="text-3xl font-black text-emerald-400 mb-2">
                {formPrice ? Number(formPrice).toLocaleString('ru-RU') : '0'} ₽
                <span className="text-sm text-slate-400 font-normal ml-2">
                  на {formDuration || '0'} дн.
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {formFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={
                        f.included ? 'text-emerald-400' : 'text-slate-600'
                      }
                    >
                      {f.included ? '✓' : '✕'}
                    </span>
                    <span
                      className={
                        f.included ? 'text-slate-300' : 'text-slate-600'
                      }
                    >
                      {f.text || '(пусто)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
