"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdminData";
import { AlertCircle, Users, Clock, CheckCircle } from "lucide-react";
import { shouldShowNotificationBadge, getNotificationBadgeVariant } from "@/lib/notifications/notification-policy";

const AdminActions = memo(function AdminActions() {
  const router = useRouter();
  const { data: stats, isLoading, error } = useAdminStats();

  const navigateToAdmin = useCallback(() => router.push("/admin"), [router]);
  const navigateToPending = useCallback(() => router.push("/admin/pending-requests"), [router]);
  const navigateToToil = useCallback(() => router.push("/admin/toil"), [router]);

  return (
    <div className="space-y-4">
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
          <CardDescription>
            Manage leave requests and system administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <Button 
              variant="default"
              onClick={navigateToAdmin}
            >
              Admin Dashboard
            </Button>
            <Button 
              variant={shouldShowNotificationBadge(stats?.pendingRequests || 0) ? "destructive" : "outline"}
              onClick={navigateToPending}
            >
              Pending Requests
              {shouldShowNotificationBadge(stats?.pendingRequests || 0) && (
                <Badge variant={getNotificationBadgeVariant(stats?.pendingRequests || 0)} className="ml-2">
                  {stats?.pendingRequests}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={navigateToToil}
            >
              Manage TOIL
              {shouldShowNotificationBadge(stats?.toilPending || 0) && (
                <Badge variant={getNotificationBadgeVariant(stats?.toilPending || 0)} className="ml-2">
                  {stats?.toilPending}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              disabled
            >
              User Management
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Overview
          </CardTitle>
          <CardDescription>
            Real-time system statistics and pending actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-destructive">Failed to load admin statistics</p>
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                </div>
                {shouldShowNotificationBadge(stats.pendingRequests) && (
                  <Badge variant={getNotificationBadgeVariant(stats.pendingRequests)} className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Action Required
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Employees</p>
                  <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TOIL Pending</p>
                  <p className="text-2xl font-bold">{stats.toilPending}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved This Month</p>
                  <p className="text-2xl font-bold">{stats.approvedThisMonth}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
});

export default AdminActions;