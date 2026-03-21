import { Skeleton } from '@/components/ui/skeleton';

export default function MealPlanSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40 bg-slate-800" />
        <Skeleton className="h-9 w-32 rounded-xl bg-slate-800" />
      </div>

      {/* Day tabs skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-10 w-12 rounded-xl bg-slate-800 flex-shrink-0" />
        ))}
      </div>

      {/* Day title */}
      <Skeleton className="h-5 w-32 bg-slate-800" />

      {/* Meal cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
            </div>
            <Skeleton className="h-5 w-48 mb-2 bg-slate-800" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-12 bg-slate-800" />
              <Skeleton className="h-4 w-12 bg-slate-800" />
              <Skeleton className="h-4 w-12 bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Day total skeleton */}
      <Skeleton className="h-10 w-full rounded-xl bg-slate-800" />
    </div>
  );
}