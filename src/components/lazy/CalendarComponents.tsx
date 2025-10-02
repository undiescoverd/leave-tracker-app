import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load calendar components with loading skeletons
export const LazyTeamCalendar = dynamic(
  () => import('@/components/calendar/TeamCalendar'),
  {
    loading: () => (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
            {Array.from({ length: 42 }, (_, i) => (
              <div key={i} className="min-h-[100px] p-2 border border-border">
                <Skeleton className="h-4 w-6 mb-1" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyCalendarPage = dynamic(
  () => import('@/app/calendar/page'),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    ),
    ssr: false,
  }
);
