'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

interface MealLogItem {
  id: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_e_mg?: number;
  vitamin_b12_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  zinc_mg?: number;
}

interface UserProfile {
  target_fiber_g?: number;
  target_sodium_mg?: number;
  target_sugar_g?: number;
  target_vitamin_a_mcg?: number;
  target_vitamin_c_mg?: number;
  target_vitamin_d_mcg?: number;
  target_vitamin_e_mg?: number;
  target_vitamin_b12_mcg?: number;
  target_calcium_mg?: number;
  target_iron_mg?: number;
  target_magnesium_mg?: number;
  target_potassium_mg?: number;
  target_zinc_mg?: number;
}

// Daily targets (default values based on average adult needs)
const DEFAULT_TARGETS = {
  fiber_g: 25,
  sodium_mg: 2300,
  sugar_g: 50,
  vitamin_a_mcg: 900,
  vitamin_c_mg: 90,
  vitamin_d_mcg: 20,
  vitamin_e_mg: 15,
  vitamin_b12_mcg: 2.4,
  calcium_mg: 1000,
  iron_mg: 18,
  magnesium_mg: 400,
  potassium_mg: 4700,
  zinc_mg: 11,
};

interface NutrientItem {
  name: string;
  value: number;
  unit: string;
  target: number;
  category: 'vitamin' | 'mineral' | 'other';
}

export default function MicronutrientPanel() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch today's meal logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['meal_logs_today'],
    queryFn: async () => {
      try {
        const res = await client.entities.meal_logs.query({ limit: 100 });
        const raw = (res?.data as any)?.items ?? (res?.data as any) ?? [];
        const allLogs: MealLogItem[] = Array.isArray(raw) ? raw : [];
        const today = new Date().toISOString().split('T')[0];
        return allLogs.filter((log) => {
          const logDate = (log as any).logged_at?.split('T')[0];
          return logDate === today;
        });
      } catch (error) {
        console.error('Error fetching meal logs:', error);
        return [];
      }
    },
    enabled: isClient,
  });

  // Fetch user profile for targets
  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      try {
        const res = await client.entities.user_profiles.query({ limit: 1 });
        return ((res.data as any)?.items?.[0] as UserProfile) || null;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    },
    enabled: isClient,
  });

  if (!isClient) {
    return null;
  }

  if (logsLoading) {
    return (
      <Card className="w-full rounded-2xl bg-slate-900/50 border-slate-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">Микронутриенты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = {
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    vitamin_a_mcg: 0,
    vitamin_c_mg: 0,
    vitamin_d_mcg: 0,
    vitamin_e_mg: 0,
    vitamin_b12_mcg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    magnesium_mg: 0,
    potassium_mg: 0,
    zinc_mg: 0,
  };

  const safeLogs = Array.isArray(logsData) ? logsData : [];

  safeLogs.forEach((log: MealLogItem) => {
    totals.fiber_g += log.fiber_g || 0;
    totals.sugar_g += log.sugar_g || 0;
    totals.sodium_mg += log.sodium_mg || 0;
    totals.vitamin_a_mcg += log.vitamin_a_mcg || 0;
    totals.vitamin_c_mg += log.vitamin_c_mg || 0;
    totals.vitamin_d_mcg += log.vitamin_d_mcg || 0;
    totals.vitamin_e_mg += log.vitamin_e_mg || 0;
    totals.vitamin_b12_mcg += log.vitamin_b12_mcg || 0;
    totals.calcium_mg += log.calcium_mg || 0;
    totals.iron_mg += log.iron_mg || 0;
    totals.magnesium_mg += log.magnesium_mg || 0;
    totals.potassium_mg += log.potassium_mg || 0;
    totals.zinc_mg += log.zinc_mg || 0;
  });

  // Get targets from profile or use defaults
  const targets = profileData ? {
    fiber_g: profileData.target_fiber_g || DEFAULT_TARGETS.fiber_g,
    sugar_g: profileData.target_sugar_g || DEFAULT_TARGETS.sugar_g,
    sodium_mg: profileData.target_sodium_mg || DEFAULT_TARGETS.sodium_mg,
    vitamin_a_mcg: profileData.target_vitamin_a_mcg || DEFAULT_TARGETS.vitamin_a_mcg,
    vitamin_c_mg: profileData.target_vitamin_c_mg || DEFAULT_TARGETS.vitamin_c_mg,
    vitamin_d_mcg: profileData.target_vitamin_d_mcg || DEFAULT_TARGETS.vitamin_d_mcg,
    vitamin_e_mg: profileData.target_vitamin_e_mg || DEFAULT_TARGETS.vitamin_e_mg,
    vitamin_b12_mcg: profileData.target_vitamin_b12_mcg || DEFAULT_TARGETS.vitamin_b12_mcg,
    calcium_mg: profileData.target_calcium_mg || DEFAULT_TARGETS.calcium_mg,
    iron_mg: profileData.target_iron_mg || DEFAULT_TARGETS.iron_mg,
    magnesium_mg: profileData.target_magnesium_mg || DEFAULT_TARGETS.magnesium_mg,
    potassium_mg: profileData.target_potassium_mg || DEFAULT_TARGETS.potassium_mg,
    zinc_mg: profileData.target_zinc_mg || DEFAULT_TARGETS.zinc_mg,
  } : DEFAULT_TARGETS;

  // Build nutrient list
  const nutrients: NutrientItem[] = [
    // Vitamins
    { name: 'Витамин A', value: totals.vitamin_a_mcg, unit: 'мкг', target: targets.vitamin_a_mcg, category: 'vitamin' },
    { name: 'Витамин C', value: totals.vitamin_c_mg, unit: 'мг', target: targets.vitamin_c_mg, category: 'vitamin' },
    { name: 'Витамин D', value: totals.vitamin_d_mcg, unit: 'мкг', target: targets.vitamin_d_mcg, category: 'vitamin' },
    { name: 'Витамин E', value: totals.vitamin_e_mg, unit: 'мг', target: targets.vitamin_e_mg, category: 'vitamin' },
    { name: 'Витамин B12', value: totals.vitamin_b12_mcg, unit: 'мкг', target: targets.vitamin_b12_mcg, category: 'vitamin' },
    // Minerals
    { name: 'Кальций', value: totals.calcium_mg, unit: 'мг', target: targets.calcium_mg, category: 'mineral' },
    { name: 'Железо', value: totals.iron_mg, unit: 'мг', target: targets.iron_mg, category: 'mineral' },
    { name: 'Магний', value: totals.magnesium_mg, unit: 'мг', target: targets.magnesium_mg, category: 'mineral' },
    { name: 'Калий', value: totals.potassium_mg, unit: 'мг', target: targets.potassium_mg, category: 'mineral' },
    { name: 'Цинк', value: totals.zinc_mg, unit: 'мг', target: targets.zinc_mg, category: 'mineral' },
    // Other
    { name: 'Клетчатка', value: totals.fiber_g, unit: 'г', target: targets.fiber_g, category: 'other' },
    { name: 'Натрий', value: totals.sodium_mg, unit: 'мг', target: targets.sodium_mg, category: 'other' },
    { name: 'Сахар', value: totals.sugar_g, unit: 'г', target: targets.sugar_g, category: 'other' },
  ];

  const vitamins = nutrients.filter(n => n.category === 'vitamin');
  const minerals = nutrients.filter(n => n.category === 'mineral');
  const others = nutrients.filter(n => n.category === 'other');

  const hasMeals = safeLogs.length > 0;
  const totalMicroSum = Object.values(totals).reduce((s, v) => s + v, 0);
  const microCalculated = totalMicroSum > 0;

  const NutrientCard = ({ nutrient }: { nutrient: NutrientItem }) => {
    const percentage = Math.min((nutrient.value / nutrient.target) * 100, 100);
    const isDeficient = percentage < 50;
    const isGood = percentage >= 80;

    return (
      <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-all border border-slate-700/40">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-100">{nutrient.name}</span>
            <span className="text-xs text-slate-400 ml-2 text-right">
              {nutrient.value.toFixed(1)} / {nutrient.target} {nutrient.unit}
            </span>
          </div>
          <Progress
            value={percentage}
            className={`h-2 ${isDeficient ? 'bg-rose-950/50' : isGood ? 'bg-emerald-950/50' : 'bg-amber-950/50'}`}
          />
        </div>
        <div className="ml-3">
          {isGood ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isDeficient ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full rounded-2xl bg-slate-900/50 border-slate-800/50 transition-all hover:border-indigo-500/30">
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Микронутриенты
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasMeals && (
          <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-sm text-slate-400">
            Добавьте приёмы пищи, чтобы увидеть расчёт по витаминам и минералам.
          </div>
        )}
        {hasMeals && !microCalculated && (
          <div className="mb-4 rounded-xl border border-amber-600/30 bg-amber-500/10 p-3 text-sm text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Микронутриенты пока не рассчитаны. Данные появятся после обработки AI-сервисом.
          </div>
        )}
        <Tabs defaultValue="vitamins" className="w-full">
          <TabsList className="w-full grid grid-cols-3 gap-1 rounded-xl border border-slate-700/60 bg-slate-800/40 p-1">
            <TabsTrigger
              value="vitamins"
              className="min-w-0 overflow-visible whitespace-nowrap rounded-lg px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-sm text-slate-300 transition-all hover:text-white hover:bg-indigo-500/20 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              Витамины
            </TabsTrigger>
            <TabsTrigger
              value="minerals"
              className="min-w-0 overflow-visible whitespace-nowrap rounded-lg px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-sm text-slate-300 transition-all hover:text-white hover:bg-indigo-500/20 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              Минералы
            </TabsTrigger>
            <TabsTrigger
              value="other"
              className="min-w-0 overflow-visible whitespace-nowrap rounded-lg px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-sm text-slate-300 transition-all hover:text-white hover:bg-indigo-500/20 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              Другое
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="vitamins" className="space-y-3 mt-4">
            {vitamins.map(nutrient => (
              <NutrientCard key={nutrient.name} nutrient={nutrient} />
            ))}
          </TabsContent>
          
          <TabsContent value="minerals" className="space-y-3 mt-4">
            {minerals.map(nutrient => (
              <NutrientCard key={nutrient.name} nutrient={nutrient} />
            ))}
          </TabsContent>
          
          <TabsContent value="other" className="space-y-3 mt-4">
            {others.map(nutrient => (
              <NutrientCard key={nutrient.name} nutrient={nutrient} />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}