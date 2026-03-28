'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getAPIBaseURL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

const QUICK_ADD_AMOUNTS = [100, 250, 500];

export default function WaterTracker() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch today's water summary
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['water-summary'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${getAPIBaseURL()}/api/v1/entities/water_logs/today`);
        return res.data as WaterSummary;
      } catch (error: any) {
        console.error('Error fetching water summary:', error);
        return null;
      }
    },
    enabled: isClient,
  });

  // Fetch today's entries
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['water-logs'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await axios.get(`${getAPIBaseURL()}/api/v1/entities/water_logs?limit=50`);
        const allLogs = (res.data as any)?.items || [];
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

  // Add water mutation
  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      const res = await axios.post(`${getAPIBaseURL()}/api/v1/entities/water_logs`, {
        amount_ml: amountMl,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-summary'] });
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
      toast.success(`Добавлено ${addWaterMutation.variables}мл воды`);
    },
    onError: (error: any) => {
      toast.error('Ошибка при добавлении воды');
      console.error(error);
    },
  });

  // Delete water log mutation
  const deleteWaterMutation = useMutation({
    mutationFn: async (logId: number) => {
      await axios.delete(`${getAPIBaseURL()}/api/v1/entities/water_logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-summary'] });
      queryClient.invalidateQueries({ queryKey: ['water-logs'] });
      toast.success('Запись удалена');
    },
    onError: (error: any) => {
      toast.error('Ошибка при удалении записи');
      console.error(error);
    },
  });

  const handleQuickAdd = useCallback((amount: number) => {
    addWaterMutation.mutate(amount);
  }, [addWaterMutation]);

  if (!isClient) {
    return null;
  }

  if (summaryLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
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

  const summary = summaryData || { total_ml: 0, target_ml: 2000, percentage: 0, entries_count: 0, date: '' };
  const percentage = Math.min(summary.percentage, 100);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Вода
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                className="text-gray-200"
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
                className="text-blue-500 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{summary.total_ml}</span>
              <span className="text-xs text-muted-foreground">/ {summary.target_ml} мл</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
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
              className="flex flex-col h-auto py-2"
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
            <p className="text-sm font-medium">Сегодня:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {logsData.map((log: WaterLogItem) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-950 rounded px-2 py-1"
                >
                  <span>{log.amount_ml} мл</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
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