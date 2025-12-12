"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusVariant, statusConfig } from "@/lib/theme-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { clearAllCaches } from "@/lib/cache/clear-all-caches";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  comments?: string;
  reason?: string; // Mapped from comments for consistency with employee view
  createdAt: string;
  type?: string;
  hours?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  // Admin API format
  employeeName?: string;
  employeeEmail?: string;
  employeeRole?: string;
  days?: number;
  submittedAt?: string;
}

export default function PendingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchLeaveRequests();
      // Poll every 5 seconds for fast updates
      const interval = setInterval(fetchLeaveRequests, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Update "time ago" every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaveRequests = async (manual = false, bustCache = false) => {
    if (manual) setRefreshing(true);
    try {
      // Add cache busting parameter to force fresh data
      const cacheBuster = bustCache ? `?_t=${Date.now()}` : '';

      // Fetch both pending and all requests in parallel
      const [pendingResponse, allResponse] = await Promise.all([
        fetch(`/api/admin/pending-requests${cacheBuster}`, {
          credentials: "include",
          cache: bustCache ? "no-store" : "default"
        }),
        fetch(`/api/admin/all-requests${cacheBuster}`, {
          credentials: "include",
          cache: bustCache ? "no-store" : "default"
        })
      ]);

      const [pendingData, allData] = await Promise.all([
        pendingResponse.json(),
        allResponse.json()
      ]);

      if (pendingResponse.ok) {
        setLeaveRequests(pendingData.data?.requests || []);
      } else {
        console.error("Failed to fetch pending requests:", pendingData.error);
      }

      if (allResponse.ok) {
        // Map comments to reason for consistency with employee view
        const requestsWithReason = (allData.data?.requests || []).map((req: LeaveRequest) => ({
          ...req,
          reason: req.comments || req.reason || 'No reason provided'
        }));
        setAllRequests(requestsWithReason);
      } else {
        console.error("Failed to fetch all requests:", allData.error);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const handleManualRefresh = () => {
    fetchLeaveRequests(true);
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const response = await fetch(`/api/leave/request/${requestId}/approve`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        showSuccess("Leave request approved successfully!");
        // Bust cache and refresh the list
        await fetchLeaveRequests(false, true);
      } else {
        const error = await response.json();
        console.error("Approval error response:", error);
        showError(`Failed to approve: ${error.error?.message || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      showError("Error approving request");
      console.error("Error:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectComment.trim()) {
      showError("Please provide a reason for rejection");
      return;
    }

    setProcessing(requestId);
    try {
      const response = await fetch(`/api/leave/request/${requestId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectComment.trim()
        }),
      });

      if (response.ok) {
        showSuccess("Leave request rejected successfully!");
        // Bust cache and refresh the list
        await fetchLeaveRequests(false, true);
        setRejectComment(""); // Clear comment
        setShowRejectModal(null); // Close modal
      } else {
        const error = await response.json();
        showError(`Failed to reject: ${error.error?.message || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      showError("Error rejecting request");
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


  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Ensure leaveRequests is always an array
  const pendingRequests = leaveRequests || [];
  const allRequestsList = allRequests || [];

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
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground/70">
                    Updated {getTimeAgo(lastUpdated)}
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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
                                Submitted: {formatDate(request.createdAt || request.submittedAt || new Date().toISOString())}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="success"
                              onClick={() => handleApprove(request.id)}
                              disabled={processing === request.id}
                              size="sm"
                            >
                              {processing === request.id ? "Processing..." : "Approve"}
                            </Button>
                            <Button
                              variant="error"
                              size="sm"
                              onClick={() => setShowRejectModal(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? "Processing..." : "Reject"}
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

          {/* All Other Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle>All Requests ({allRequestsList.length})</CardTitle>
              <CardDescription>Complete history of all leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {allRequestsList.length === 0 ? (
                <p className="text-muted-foreground">No leave requests found.</p>
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
                          <div>
                            <div className="font-medium">
                              {request.user?.name || request.employeeName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.user?.email || request.employeeEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>
                          <div>{request.reason || request.comments || 'No reason provided'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(request.createdAt || request.submittedAt || new Date().toISOString())}
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
      
      {/* Rejection Modal */}
      <Dialog open={!!showRejectModal} onOpenChange={(open) => {
        if (!open) {
          setShowRejectModal(null);
          setRejectComment("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectComment">Reason for Rejection *</Label>
              <Textarea
                id="rejectComment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                placeholder="Please provide a reason for rejecting this leave request..."
                required
              />
            </div>
          </div>

          <DialogFooter className="space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(null);
                setRejectComment("");
              }}
              disabled={processing === showRejectModal}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReject(showRejectModal!)}
              disabled={!rejectComment.trim() || processing === showRejectModal}
            >
              {processing === showRejectModal ? "Processing..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notifications */}
    </div>
  );
}
