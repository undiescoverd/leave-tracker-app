"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusVariant } from "@/lib/theme-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  comments?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PendingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
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
    }
  }, [session]);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch("/api/leave/request");
      const data = await response.json();
      
      if (response.ok) {
        setLeaveRequests(data.data?.leaveRequests || data.leaveRequests || []);
      } else {
        console.error("Failed to fetch leave requests:", data.error);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const response = await fetch(`/api/leave/request/${requestId}/approve`, {
        method: "POST",
      });
      
      if (response.ok) {
        showSuccess("Leave request approved successfully!");
        fetchLeaveRequests(); // Refresh the list
      } else {
        const error = await response.json();
        showError(`Failed to approve: ${error.error}`);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectComment.trim()
        }),
      });
      
      if (response.ok) {
        showSuccess("Leave request rejected successfully!");
        fetchLeaveRequests(); // Refresh the list
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
  const requests = leaveRequests || [];
  const pendingRequests = requests.filter(req => req.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                TDH Agency Leave Tracker - Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <div className="flex space-x-2">
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
                              {request.user.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{request.user.email}</p>
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
                                Submitted: {formatDate(request.createdAt)}
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
              <CardTitle>All Requests ({leaveRequests.length})</CardTitle>
              <CardDescription>Complete history of all leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <p className="text-muted-foreground">No leave requests found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {request.user.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(request.createdAt)}
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
