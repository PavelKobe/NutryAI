'use client';

import { useEffect, useRef, useState } from 'react';
import { client } from '@/lib/api';
import { localDateKeyFromLoggedAt, localTodayKey } from '@/lib/date_local';
import { calcStreak, calcWeeklyAverages, calcWeightChange } from '@/lib/stats-calc';
import { captureCardToBlob, shareOrDownload, downloadBlob } from '@/lib/share-card';
import DailyStatsCard from './DailyStatsCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Share2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'daily' | 'weekly';
}

interface DailyData {
  date: string;
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  fat: number;
  targetFat: number;
  carbs: number;
  targetCarbs: number;
  waterMl: number;
  targetWaterMl: number;
  mealsCount: number;
}

interface WeeklyData {
  dateRange: string;
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  weightChange: { startWeight: number; endWeight: number; change: number } | null;
  streak: number;
  daysWithData: number;
}

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDateRu(d: Date): string {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateRangeRu(): string {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_RU[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS_RU[start.getMonth()]} – ${end.getDate()} ${MONTHS_RU[end.getMonth()]}`;
}

export default function ShareStatsModal({ open, onOpenChange, mode }: ShareStatsModalProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>(mode);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const dailyCardRef = useRef<HTMLDivElement>(null);
  const weeklyCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(mode);
      loadData();
    }
  }, [open, mode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, logsRes, waterRes, weightRes] = await Promise.all([
        client.entities.user_profiles.query({ limit: 1 }),
        client.entities.meal_logs.query({ sort: '-logged_at', limit: 200 }),
        client.entities.water_logs.query({ sort: '-created_at', limit: 50 }),
        client.entities.weight_logs.query({ sort: 'logged_at', limit: 30 }),
      ]);

      const profiles = profileRes?.data?.items ?? profileRes?.data ?? [];
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      const allLogs = logsRes?.data?.items ?? logsRes?.data ?? [];
      const logs = Array.isArray(allLogs) ? allLogs : [];
      const allWater = waterRes?.data?.items ?? waterRes?.data ?? [];
      const waterLogs = Array.isArray(allWater) ? allWater : [];
      const allWeight = weightRes?.data?.items ?? weightRes?.data ?? [];
      const weightLogs = Array.isArray(allWeight) ? allWeight : [];

      // Daily
      const today = localTodayKey();
      const todayLogs = logs.filter(
        (l: { logged_at: string }) => localDateKeyFromLoggedAt(l.logged_at) === today
      );
      const todayWater = waterLogs.filter(
        (w: { logged_at?: string; created_at?: string }) =>
          localDateKeyFromLoggedAt(w.logged_at || w.created_at || '') === today
      );

      const totalWater = todayWater.reduce((sum: number, w: { amount_ml?: number }) => sum + (w.amount_ml || 0), 0);

      setDailyData({
        date: formatDateRu(new Date()),
        calories: Math.round(todayLogs.reduce((s: number, l: { calories?: number }) => s + (l.calories || 0), 0)),
        targetCalories: profile?.target_calories || 2000,
        protein: Math.round(todayLogs.reduce((s: number, l: { protein?: number }) => s + (l.protein || 0), 0)),
        targetProtein: profile?.target_protein || 120,
        fat: Math.round(todayLogs.reduce((s: number, l: { fat?: number }) => s + (l.fat || 0), 0)),
        targetFat: profile?.target_fat || 65,
        carbs: Math.round(todayLogs.reduce((s: number, l: { carbs?: number }) => s + (l.carbs || 0), 0)),
        targetCarbs: profile?.target_carbs || 250,
        waterMl: totalWater,
        targetWaterMl: profile?.target_water_ml || 2000,
        mealsCount: todayLogs.length,
      });

      // Weekly
      const weekly = calcWeeklyAverages(logs);
      const wc = calcWeightChange(weightLogs);
      const streak = calcStreak(logs);

      setWeeklyData({
        dateRange: formatDateRangeRu(),
        avgCalories: weekly.avgCalories,
        avgProtein: weekly.avgProtein,
        avgFat: weekly.avgFat,
        avgCarbs: weekly.avgCarbs,
        weightChange: wc,
        streak,
        daysWithData: weekly.daysWithData,
      });
    } catch (err) {
      console.error('Failed to load share data:', err);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const getActiveRef = () => (activeTab === 'daily' ? dailyCardRef : weeklyCardRef);

  const handleShare = async () => {
    const el = getActiveRef().current;
    if (!el) return;
    setCapturing(true);
    try {
      const blob = await captureCardToBlob(el);
      const filename = `nutryai-${activeTab}-${localTodayKey()}.png`;
      const result = await shareOrDownload(blob, filename);
      toast.success(result === 'shared' ? 'Отправлено!' : 'Карточка сохранена!');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Не удалось поделиться');
      }
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = async () => {
    const el = getActiveRef().current;
    if (!el) return;
    setCapturing(true);
    try {
      const blob = await captureCardToBlob(el);
      downloadBlob(blob, `nutryai-${activeTab}-${localTodayKey()}.png`);
      toast.success('Карточка сохранена!');
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поделиться статистикой</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daily' | 'weekly')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Дневная</TabsTrigger>
            <TabsTrigger value="weekly">Недельная</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            {loading || !dailyData ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border" style={{ height: 340 }}>
                <div style={{ transform: 'scale(0.58)', transformOrigin: 'top left', width: 400 }}>
                  <DailyStatsCard {...dailyData} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            {loading || !weeklyData ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border" style={{ height: 340 }}>
                <div style={{ transform: 'scale(0.58)', transformOrigin: 'top left', width: 400 }}>
                  <WeeklyStatsCard {...weeklyData} />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-2">
          <Button onClick={handleShare} disabled={capturing || loading} className="flex-1 gap-2">
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Поделиться
          </Button>
          <Button onClick={handleDownload} variant="outline" disabled={capturing || loading} className="flex-1 gap-2">
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать
          </Button>
        </div>
      </DialogContent>

      {/* Hidden full-size cards for html2canvas capture */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
        {dailyData && <DailyStatsCard ref={dailyCardRef} {...dailyData} />}
        {weeklyData && <WeeklyStatsCard ref={weeklyCardRef} {...weeklyData} />}
      </div>
    </Dialog>
  );
}
