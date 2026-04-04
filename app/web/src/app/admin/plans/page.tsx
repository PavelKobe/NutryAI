'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminPlan, AdminPlanPatch, PlanFeature } from '@/lib/adminApi';
import { adminListPlans, adminPatchPlan } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [formName, setFormName] = useState('');
  const [formMonthly, setFormMonthly] = useState('');
  const [formYearly, setFormYearly] = useState('');
  const [formDailyLimit, setFormDailyLimit] = useState('');
  const [formFeatures, setFormFeatures] = useState<PlanFeature[]>([]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: adminListPlans,
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminPlanPatch }) => adminPatchPlan(id, body),
    onSuccess: () => {
      toast.success('Тариф обновлён');
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(plan: AdminPlan) {
    setEditing(plan);
    setFormName(plan.name);
    setFormMonthly(plan.price_monthly ?? '');
    setFormYearly(plan.price_yearly ?? '');
    setFormDailyLimit(String(plan.daily_ai_limit));
    setFormFeatures(plan.features ? [...plan.features] : []);
  }

  function saveEdit() {
    if (!editing) return;
    const body: AdminPlanPatch = {
      name: formName.trim() || undefined,
      price_monthly: formMonthly !== '' ? Number(formMonthly) : undefined,
      price_yearly: formYearly !== '' ? Number(formYearly) : undefined,
      daily_ai_limit: formDailyLimit !== '' ? Number(formDailyLimit) : undefined,
      features: formFeatures,
    };
    patchMut.mutate({ id: editing.id, body });
  }

  function addFeature() {
    setFormFeatures((prev) => [...prev, { text: '', included: true }]);
  }

  function removeFeature(idx: number) {
    setFormFeatures((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateFeatureText(idx: number, text: string) {
    setFormFeatures((prev) => prev.map((f, i) => (i === idx ? { ...f, text } : f)));
  }

  function toggleFeatureIncluded(idx: number, included: boolean) {
    setFormFeatures((prev) => prev.map((f, i) => (i === idx ? { ...f, included } : f)));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Тарифные планы</h1>

      {isLoading && <p className="text-slate-400">Загрузка…</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {plans?.map((plan) => (
          <Card key={plan.id} className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100 text-lg">{plan.name}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                  Редактировать
                </Button>
              </div>
              <div className="flex gap-4 text-sm text-slate-400 pt-1">
                <span>{plan.price_monthly ? `${plan.price_monthly} ₽/мес` : 'Бесплатно'}</span>
                {plan.price_yearly && <span>{plan.price_yearly} ₽/год</span>}
                <span>{plan.daily_ai_limit} запросов/день</span>
              </div>
            </CardHeader>
            <CardContent>
              {plan.features && plan.features.length > 0 ? (
                <ul className="space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className={f.included ? 'text-emerald-400' : 'text-slate-600'}>
                        {f.included ? '✓' : '✕'}
                      </span>
                      <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">Нет фич — нажмите «Редактировать»</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать тариф: {editing?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Название</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Цена в месяц (₽)</Label>
                <Input
                  type="number"
                  value={formMonthly}
                  onChange={(e) => setFormMonthly(e.target.value)}
                  placeholder="0 = бесплатно"
                  className="border-slate-700 bg-slate-900"
                />
              </div>
              <div className="space-y-1">
                <Label>Цена в год (₽)</Label>
                <Input
                  type="number"
                  value={formYearly}
                  onChange={(e) => setFormYearly(e.target.value)}
                  className="border-slate-700 bg-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Лимит ИИ-запросов в день</Label>
              <Input
                type="number"
                value={formDailyLimit}
                onChange={(e) => setFormDailyLimit(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>

            {/* Features editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Функции тарифа</Label>
                <Button size="sm" variant="outline" type="button" onClick={addFeature}>
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
                      className="border-slate-700 bg-slate-900 text-sm"
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
                  <p className="text-slate-500 text-sm">Нет функций. Нажмите «+ Добавить».</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
            <Button
              onClick={saveEdit}
              disabled={patchMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
