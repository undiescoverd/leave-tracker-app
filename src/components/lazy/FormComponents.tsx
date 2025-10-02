import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load form components with loading skeletons
export const LazyLeaveRequestForm = dynamic(
  () => import('@/components/LeaveRequestForm'),
  {
    loading: () => (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyTOILForm = dynamic(
  () => import('@/components/leave/toil/TOILForm'),
  {
    loading: () => (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyLeaveRequestsPage = dynamic(
  () => import('@/app/leave/requests/page'),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);
