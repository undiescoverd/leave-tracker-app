"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStatusVariant } from "@/lib/theme-utils";
import { useLeaveRequests, useCancelLeaveRequest } from "@/hooks/useLeaveRequests";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  days: number;
  createdAt: string;
  adminComment?: string;
}

export default function LeaveRequestsPageOptimized() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  // Use React Query hooks
  const {
    data: requestsData,
    isLoading: loading,
    error: fetchError,
    refetch
  } = useLeaveRequests({
    userId: session?.user?.id || "",
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page: currentPage,
    limit: pageSize,
    startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange?.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
    enabled: !!session?.user?.id && status === "authenticated"
  });

  const cancelRequestMutation = useCancelLeaveRequest();

  // Memoized values for performance
  const safeRequests = useMemo(() => 
    requestsData?.requests || [], 
    [requestsData?.requests]
  );

  const totalPages = useMemo(() => 
    requestsData?.totalPages || 1, 
    [requestsData?.totalPages]
  );

  const totalCount = useMemo(() => 
    requestsData?.total || 0, 
    [requestsData?.total]
  );

  const displayedRangeStart = totalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const displayedRangeEnd = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);
  const filtersApplied = statusFilter !== "ALL" || !!dateRange?.from;

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("ALL");
    setDateRange(undefined);
    setCurrentPage(1);
  }, []);

  const error = fetchError?.message || "";

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

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

  const canCancelRequest = (request: LeaveRequest) => {
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
      return false;
    }
    
    // Allow cancellation until the leave has ended (not just before it starts)
    const endDate = new Date(request.endDate);
    const now = new Date();
    // Set end date to end of day for comparison
    endDate.setHours(23, 59, 59, 999);
    return endDate >= now;
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequest(true);
    try {
      await cancelRequestMutation.mutateAsync(requestId);
      toast.success('Leave request cancelled successfully');
      setShowCancelModal(null);
    } catch (err) {
      console.error('Error cancelling request:', err);
      toast.error('Failed to cancel leave request');
    } finally {
      setCancellingRequest(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Leave History</h1>
              <p className="mt-2 text-muted-foreground">View and track all your leave requests</p>
            </div>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Filter and Pagination Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-foreground">Filter by Status:</label>
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Requests</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-foreground">Date Range:</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  placeholder="Select range"
                  className="w-full sm:w-[260px]"
                />
                {filtersApplied && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="self-start sm:self-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground">Show:</label>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                Showing {displayedRangeStart} to {displayedRangeEnd} of {totalCount} requests
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>Your complete leave request history</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              </div>
            ) : safeRequests.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No leave requests found</p>
                <Button onClick={() => router.push('/dashboard')}>
                  Submit New Request
                </Button>
              </div>
            ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block sm:hidden p-4 space-y-3">
                {safeRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.days} days</p>
                        </div>
                        <Badge variant={getStatusVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-foreground mb-2">
                        {request.reason || 'No reason provided'}
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatDate(request.createdAt)}
                      </p>
                      
                      {request.adminComment && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <strong>Admin Comment:</strong> {request.adminComment}
                        </div>
                      )}
                      
                      {canCancelRequest(request) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => setShowCancelModal(request.id)}
                          disabled={cancelRequestMutation.isPending}
                        >
                          Cancel Request
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>
                          <div>{request.reason || 'No reason provided'}</div>
                          {request.adminComment && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Admin: {request.adminComment}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell>
                          {canCancelRequest(request) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowCancelModal(request.id)}
                              disabled={cancelRequestMutation.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          </CardContent>
        </Card>
        
        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[2rem]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!showCancelModal} onOpenChange={(open) => {
        if (!open && !cancellingRequest) {
          setShowCancelModal(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(null)}
              disabled={cancellingRequest}
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={() => showCancelModal && handleCancelRequest(showCancelModal)}
              disabled={cancellingRequest}
            >
              {cancellingRequest ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
