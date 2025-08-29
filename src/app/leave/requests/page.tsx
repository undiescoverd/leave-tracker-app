"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusVariant } from "@/lib/theme-utils";

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

export default function LeaveRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Ensure requests is always an array
  const safeRequests = Array.isArray(requests) ? requests : [];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRequests();
    }
  }, [status, router, currentPage, pageSize, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await fetch(`/api/leave/requests?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        // Ensure we have an array, even if the API returns unexpected data
        const requestsArray = Array.isArray(data.data?.requests) 
          ? data.data.requests 
          : Array.isArray(data.data) 
            ? data.data 
            : [];
            
        setRequests(requestsArray);
        setTotalPages(data.data?.totalPages || 1);
        setTotalCount(data.data?.total || 0);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to fetch requests");
        setRequests([]); // Set empty array on error
      }
    } catch (err) {
      setError("Network error: Unable to fetch leave requests");
      console.error("Error fetching requests:", err);
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
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
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground">Filter by Status:</label>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Requests</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
                <span className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
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
    </div>
  );
}
