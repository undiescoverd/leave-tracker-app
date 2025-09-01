"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Check, X, Clock, Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ListLoadingSkeleton } from "@/components/ui/loading-states";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

interface PendingRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  hours?: number;
  comments?: string;
  submittedAt: string;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  coverageArranged: boolean;
}

interface PendingApprovalsWidgetProps {
  limit?: number;
  showFullTable?: boolean;
}

function PendingApprovalsWidgetComponent({ limit = 5, showFullTable = false }: PendingApprovalsWidgetProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsLoading, setActionsLoading] = useState<Set<string>>(new Set());
  const { handleAsyncOperation } = useApiError();

  const fetchPendingRequests = useCallback(async () => {
    const result = await handleAsyncOperation(
      () => adminApi.getPendingRequests(limit),
      {
        errorMessage: 'Failed to load pending requests',
        onError: (error) => setError(error.message)
      }
    );

    if (result.success && result.data) {
      setRequests((result.data as any)?.requests || []);
      setError(null);
    }
    
    setLoading(false);
  }, [limit, handleAsyncOperation]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const calculateBusinessImpact = (request: any): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const days = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days >= 5) return 'HIGH';
    if (days >= 3) return 'MEDIUM';
    return 'LOW';
  };

  const handleApprove = async (requestId: string) => {
    // Optimistic update
    const originalRequests = [...requests];
    setRequests(prev => prev.filter(req => req.id !== requestId));
    
    // Track loading state
    setActionsLoading(prev => new Set([...prev, requestId]));
    
    try {
      const result = await handleAsyncOperation(
        () => adminApi.approveRequest(requestId),
        {
          successMessage: 'Leave request approved successfully',
          errorMessage: 'Failed to approve request',
        }
      );

      if (result.success) {
        // Refresh to get latest data
        await fetchPendingRequests();
      } else {
        // Revert optimistic update
        setRequests(originalRequests);
      }
    } catch (error) {
      // Revert optimistic update on unexpected error
      setRequests(originalRequests);
    } finally {
      setActionsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    // Optimistic update
    const originalRequests = [...requests];
    setRequests(prev => prev.filter(req => req.id !== requestId));
    
    // Track loading state
    setActionsLoading(prev => new Set([...prev, requestId]));
    
    try {
      const result = await handleAsyncOperation(
        () => adminApi.rejectRequest(requestId, 'Requires further discussion'),
        {
          successMessage: 'Leave request rejected',
          errorMessage: 'Failed to reject request',
        }
      );

      if (result.success) {
        // Refresh to get latest data
        await fetchPendingRequests();
      } else {
        // Revert optimistic update
        setRequests(originalRequests);
      }
    } catch (error) {
      // Revert optimistic update on unexpected error
      setRequests(originalRequests);
    } finally {
      setActionsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ANNUAL': return 'default';
      case 'SICK': return 'secondary';
      case 'TOIL': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListLoadingSkeleton items={Math.min(limit, 3)} />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPendingRequests} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            No Pending Approvals
          </CardTitle>
          <CardDescription>
            All leave requests have been processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Great! Your team is all caught up with leave approvals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Approvals ({requests.length})
            </CardTitle>
            <CardDescription>
              Team leave requests requiring your review
            </CardDescription>
          </div>
          {!showFullTable && requests.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push("/admin/pending-requests")}
            >
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showFullTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Details</TableHead>
                <TableHead>Business Impact</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {request.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{request.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{request.employeeRole}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(request.type) as any} className="text-xs">
                          {request.type}
                        </Badge>
                        <span className="text-sm">{request.days} days</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {request.startDate} to {request.endDate}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getImpactColor(request.businessImpact) as any}>
                      {request.businessImpact}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={request.coverageArranged ? "default" : "secondary"}>
                      {request.coverageArranged ? "Arranged" : "Needed"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(request.id)}
                        disabled={actionsLoading.has(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={actionsLoading.has(request.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm">
                      {request.employeeName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{request.employeeName}</span>
                      <Badge variant={getImpactColor(request.businessImpact) as any} className="text-xs">
                        {request.businessImpact} Impact
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {request.startDate} - {request.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {request.days} days
                      </span>
                      <Badge variant={getTypeColor(request.type) as any} className="text-xs">
                        {request.type}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(request.id)}
                    disabled={actionsLoading.has(request.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {actionsLoading.has(request.id) ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleReject(request.id)}
                    disabled={actionsLoading.has(request.id)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    {actionsLoading.has(request.id) ? 'Rejecting...' : 'Reject'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export wrapped with ErrorBoundary
export default function PendingApprovalsWidget(props: PendingApprovalsWidgetProps) {
  return (
    <ErrorBoundary>
      <PendingApprovalsWidgetComponent {...props} />
    </ErrorBoundary>
  );
}