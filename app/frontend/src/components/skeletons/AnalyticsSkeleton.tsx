import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Today's Macros Pie skeleton */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <Skeleton className="h-5 w-32 mb-4 bg-slate-800" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-32 h-32 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full bg-slate-800" />
                <Skeleton className="h-4 w-16 bg-slate-800" />
                <Skeleton className="h-4 w-12 ml-auto bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Calories Chart skeleton */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <Skeleton className="h-5 w-44 mb-4 bg-slate-800" />
        <div className="h-48 flex items-end gap-2 px-4">
          {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md bg-slate-800"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Weight Trend skeleton */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <Skeleton className="h-5 w-36 mb-4 bg-slate-800" />
        <Skeleton className="h-48 w-full rounded-lg bg-slate-800" />
      </div>

      {/* Weekly Macros skeleton */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50">
        <Skeleton className="h-5 w-36 mb-4 bg-slate-800" />
        <div className="h-48 flex items-end gap-2 px-4">
          {[50, 70, 45, 85, 55, 60, 75].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md bg-slate-800"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}