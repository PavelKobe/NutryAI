'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WaterLogItem {
  id: number;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

interface WaterSummary {
  total_ml: number;
  target_ml: number;
  percentage: number;
  entries_count: number;
  date: string;
}

interface UserProfile {
  target_water_ml?: number;
}

const QUICK_ADD_AMOUNTS = [100, 250, 500];

export default function WaterTracker() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch today's entries
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['water-logs'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await client.entities.water_logs.query({ sort: '-created_at', limit: 50 });
        const allLogs = (res?.data as { items?: WaterLogItem[] } | undefined)?.items || [];
        // Filter for today
        const todayLogs = allLogs.filter((log: WaterLogItem) => {
          const logDate = (log.logged_at || '').split('T')[0];
          return logDate === today;
        });
        return todayLogs;
      } catch (error: any) {
        console.error('Error fetching water logs:', error);
        return [];
      }
    },
    enabled: isClient,
  });

  const { data: waterTarget, isLoading: targetLoading } = useQuery({
    queryKey: ['water-target'],
    queryFn: async () => {
      try {
        const res = await client.entities.user_profiles.query({ limit: 1 });
        const profile = ((res?.data as { items?: UserProfile[] } | undefined)?.items || [])[0];
        return profile?.target_water_ml || 2000;
      } catch (error) {
        console.error('Error fetching water target:', error);
        return 2000;
      }
    },
    enabled: isClient,
  });

  // Add water mutation
  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      return client.entities.water_logs.create({
        data: {
          amount_ml: amountMl,
          logged_at: new Date().toISOString(),
        },
      });
    },
    onMutate: async (amountMl: number) => {
      await queryClient.cancelQueries({ queryKey: ['water-logs'] });

      const prevLogs = queryClient.getQueryData<WaterLogItem[]>(['water-logs']);

      const optimisticLog: WaterLogItem = {
        id: -Date.now(),
        user_id: 'optimistic',
        amount_ml: amountMl,
        logged_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<WaterLogItem[]>(['water-logs'], [
        optimisticLog,
        ...(prevLogs || []),
      ]);

      return { prevLogs };
    },
    onSuccess: (_data, amountMl) => {
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
      toast.success(`Добавлено ${amountMl} мл воды`);
    },
    onError: (error: any, _variables, context) => {
      if (context?.prevLogs !== undefined) {
        queryClient.setQueryData(['water-logs'], context.prevLogs);
      }
      toast.error('Ошибка при добавлении воды');
      console.error(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
    },
  });

  // Delete water log mutation
  const deleteWaterMutation = useMutation({
    mutationFn: async (logId: number) => {
      await client.entities.water_logs.delete({ id: String(logId) });
    },
    onMutate: async (logId: number) => {
      await queryClient.cancelQueries({ queryKey: ['water-logs'] });

      const prevLogs = queryClient.getQueryData<WaterLogItem[]>(['water-logs']) || [];

      queryClient.setQueryData<WaterLogItem[]>(
        ['water-logs'],
        prevLogs.filter((l) => l.id !== logId)
      );

      return { prevLogs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
      toast.success('Запись удалена');
    },
    onError: (error: any, _variables, context) => {
      if (context?.prevLogs !== undefined) {
        queryClient.setQueryData(['water-logs'], context.prevLogs);
      }
      toast.error('Ошибка при удалении записи');
      console.error(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
    },
  });

  const handleQuickAdd = useCallback((amount: number) => {
    addWaterMutation.mutate(amount);
  }, [addWaterMutation]);

  if (!isClient) {
    return null;
  }

  if (logsLoading || targetLoading) {
    return (
      <Card className="w-full rounded-2xl bg-slate-900/50 border-slate-800/50">
        <CardHeader className="pb-2 border-b border-slate-800/50">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Droplets className="h-5 w-5 text-cyan-400" />
            Вода
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMl = (logsData || []).reduce((sum, item) => sum + (item.amount_ml || 0), 0);
  const targetMl = waterTarget || 2000;
  const summary: WaterSummary = {
    total_ml: totalMl,
    target_ml: targetMl,
    percentage: targetMl > 0 ? (totalMl / targetMl) * 100 : 0,
    entries_count: (logsData || []).length,
    date: new Date().toISOString().split('T')[0],
  };
  const percentage = Math.min(summary.percentage, 100);

  return (
    <Card className="w-full rounded-2xl bg-slate-900/50 border-slate-800/50 transition-all hover:border-cyan-500/30">
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Droplets className="h-5 w-5 text-cyan-400" />
          Вода
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Progress Circle */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${percentage * 2.51} 251`}
                strokeLinecap="round"
                className="text-cyan-400 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{summary.total_ml}</span>
              <span className="text-xs text-slate-400">/ {summary.target_ml} мл</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {percentage.toFixed(0)}% от дневной нормы
          </p>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ADD_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd(amount)}
              disabled={addWaterMutation.isPending}
              className="flex flex-col h-auto py-2 rounded-xl border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 text-cyan-100 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-3 w-3 mb-1" />
              <span>{amount} мл</span>
            </Button>
          ))}
        </div>

        {/* Today's Entries */}
        {logsLoading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : logsData && logsData.length > 0 ? (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-white">Сегодня:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {logsData.map((log: WaterLogItem) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm rounded-xl px-3 py-2 bg-slate-800/50 border border-slate-700/50"
                >
                  <span className="text-slate-100">{log.amount_ml} мл</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                    onClick={() => deleteWaterMutation.mutate(log.id)}
                    disabled={deleteWaterMutation.isPending}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}