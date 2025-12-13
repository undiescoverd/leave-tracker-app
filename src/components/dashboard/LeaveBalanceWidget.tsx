"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { summarizeLeaveBalance } from "@/lib/leave-balance";

export default function LeaveBalanceWidget() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const {
    data: balance,
    isLoading,
    error,
  } = useLeaveBalance(session?.user?.id || "", {
    enabled: !!session?.user?.id,
  });

  const summary = summarizeLeaveBalance(balance);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
          <CardDescription>Loading your allowances…</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Leave Balance</CardTitle>
            <CardDescription>We could not load your allowances</CardDescription>
          </div>
          <AlertCircle className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Leave Balance</CardTitle>
          <CardDescription>Track how much leave is still available</CardDescription>
        </div>
        <div className="text-left md:text-right">
          <p className="text-3xl font-semibold text-foreground">
            {summary.totalDaysAvailable}
            <span className="ml-1 text-base font-normal text-muted-foreground">days</span>
          </p>
          <p className="text-xs text-muted-foreground">across all leave types</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summary.metrics.map((metric) => (
            <div key={metric.key} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                      {metric.remaining}
                    </span>
                    <span className="text-sm text-muted-foreground">{metric.unit} left</span>
                  </p>
                </div>
                {metric.pending > 0 && (
                  <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">
                    -{metric.pending} pending
                  </Badge>
                )}
              </div>
              <Progress value={metric.percentUsed} className="mt-4" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{metric.used} used</span>
                <span>{metric.total} total</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {summary.pendingCount > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>{summary.pendingCount} pending request{summary.pendingCount !== 1 ? 's' : ''} ({summary.pendingTotal} {summary.pendingTotal === 1 ? 'day' : 'days'})</span>
              </>
            ) : isAdmin ? (
              <span className="text-muted-foreground">No personal pending requests</span>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>No pending requests right now</span>
              </>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/leave/requests">View history</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

