import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Calorie Ring skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40 bg-slate-800" />
          <Skeleton className="h-4 w-32 bg-slate-800" />
        </div>
        <div className="flex items-center gap-6">
          <Skeleton className="w-28 h-28 rounded-full bg-slate-800 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-16 bg-slate-800" />
                  <Skeleton className="h-4 w-20 bg-slate-800" />
                </div>
                <Skeleton className="h-2 w-full bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800" />
        ))}
      </div>

      {/* AI Insight skeleton */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <Skeleton className="h-5 w-28 mb-2 bg-slate-800" />
        <Skeleton className="h-4 w-full mb-1 bg-slate-800" />
        <Skeleton className="h-4 w-3/4 bg-slate-800" />
      </div>

      {/* Meals list skeleton */}
      <div>
        <Skeleton className="h-6 w-48 mb-3 bg-slate-800" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between"
            >
              <div>
                <Skeleton className="h-3 w-16 mb-1 bg-slate-800" />
                <Skeleton className="h-4 w-32 bg-slate-800" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1 bg-slate-800" />
                <Skeleton className="h-3 w-24 bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}