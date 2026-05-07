'use client';

import { useQuery } from '@tanstack/react-query';
import { coachingUnreadKey, fetchUnreadCounts } from '@/lib/push';

/**
 * Хук для получения числа непрочитанных coaching-сообщений.
 * - Юзерский контекст (`/api/v1/push/unread-counts`) — показывает unread от нутрициолога.
 * - Админский контекст (`/api/v1/admin/push/unread-counts`) — общий unread от всех клиентов.
 *
 * Контекст определяется по `window.location.pathname` (см. lib/push.ts).
 */
export function useUnreadCoaching(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: coachingUnreadKey,
    queryFn: async () => {
      const data = await fetchUnreadCounts();
      return data.coaching_unread || 0;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: opts?.enabled ?? true,
  });
}
