import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load admin components with loading skeletons
export const LazyAdminActions = dynamic(
  () => import('@/components/dashboard/AdminActions'),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyAdminDashboard = dynamic(
  () => import('@/app/admin/page'),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    ),
    ssr: false,
  }
);

export const LazyPendingRequests = dynamic(
  () => import('@/app/admin/pending-requests/page'),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);
