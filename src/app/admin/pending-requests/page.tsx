"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAdminRole } from "@/types/next-auth";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusVariant } from "@/lib/theme-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { clearAllCaches } from "@/lib/cache/clear-all-caches";

// ✅ Import React Query hooks with realtime subscriptions
import { usePendingRequests, useApproveLeaveRequest, useRejectLeaveRequest } from "@/hooks/useAdminData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subscribeToAllLeaveRequests } from "@/lib/realtime/supabase-realtime";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  comments?: string;
  reason?: string;
  createdAt: string;
  type?: string;
  hours?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  employeeName?: string;
  employeeEmail?: string;
  employeeRole?: string;
  days?: number;
  submittedAt?: string;
}

export default function PendingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ✅ Use React Query hooks with realtime subscriptions
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingRequests(1, 50);
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();

  // ✅ Fetch all requests (not just pending) for the "All Requests" table
  const { data: allRequestsData, isLoading: allLoading } = useQuery({
    queryKey: ['admin', 'all-requests'],
    queryFn: async () => {
      const response = await fetch('/api/admin/all-requests', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch all requests');
      const result = await response.json();
      return result.data;
    },
    enabled: !!session?.user && isAdminRole(session.user.role),
  });

  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user && !isAdminRole(session.user.role)) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // ✅ Subscribe to realtime updates for all requests
  useEffect(() => {
    if (!session?.user || !isAdminRole(session.user.role)) return;

    const subscription = subscribeToAllLeaveRequests(() => {
      // Invalidate both all-requests AND pending requests queries when any leave request changes
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pendingRequests'] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session, queryClient]);

  const handleManualRefresh = () => {
    refetchPending();
    queryClient.invalidateQueries({ queryKey: ['admin', 'all-requests'] });
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await approveMutation.mutateAsync({ requestId });
      // Queries will auto-invalidate via the mutation's onSuccess
    } catch (error) {
      // Error toast already shown by mutation
      console.error("Error:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const trimmedReason = rejectComment.trim();

    if (!trimmedReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    if (trimmedReason.length < 10) {
      toast.error("Rejection reason must be at least 10 characters long");
      return;
    }

    setProcessing(requestId);
    try {
      await rejectMutation.mutateAsync({ requestId, reason: trimmedReason });
      setRejectComment("");
      setShowRejectModal(null);
      // Queries will auto-invalidate via the mutation's onSuccess
    } catch (error) {
      // Error toast already shown by mutation
      console.error("Error:", error);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  if (status === "loading" || pendingLoading || allLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session || !isAdminRole(session.user.role)) {
    return null;
  }

  const pendingRequests = pendingData?.requests || [];
  const allRequestsList: LeaveRequest[] = allRequestsData?.requests || [];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">
                  TDH Agency Leave Tracker - Admin
                </h1>
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {pendingRequests.length} Pending
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">
                  Welcome, {session.user?.name || session.user?.email}
                </span>
                <span className="text-xs text-green-600 font-medium">
                  ● Live Updates
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={pendingLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${pendingLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin")}
                >
                  Back to Admin
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearAllCaches();
                    toast.success("Caches cleared! Refresh the page to see updated data.");
                  }}
                  className="text-xs"
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Pending Requests Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
              <CardDescription>Leave requests awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground">No pending requests to review.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-foreground">
                              {request.user?.name || request.employeeName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {request.user?.email || request.employeeEmail}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">Dates:</span> {formatDate(request.startDate)} - {formatDate(request.endDate)}
                              </p>
                              {request.comments && (
                                <p className="text-sm text-foreground">
                                  <span className="font-semibold">Comments:</span> {request.comments}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                <span className="font-semibold">Submitted:</span> {formatDate(request.submittedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={processing === request.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setShowRejectModal(request.id)}
                              disabled={processing === request.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle>All Requests ({allRequestsList.length})</CardTitle>
              <CardDescription>Complete history of all leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {allRequestsList.length === 0 ? (
                <p className="text-muted-foreground">No requests found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRequestsList.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {request.user?.name || request.employeeName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {request.user?.email || request.employeeEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.days || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm">
                            {request.comments || request.reason || 'No reason provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(request.submittedAt || request.createdAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Reject Modal */}
      <Dialog open={!!showRejectModal} onOpenChange={(open) => !open && setShowRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Please provide a detailed reason for rejecting this request (minimum 10 characters)"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be sent to the employee. Please be clear and professional.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(null);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRejectModal && handleReject(showRejectModal)}
              disabled={!rejectComment.trim() || rejectComment.trim().length < 10 || processing === showRejectModal}
            >
              {processing === showRejectModal ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
