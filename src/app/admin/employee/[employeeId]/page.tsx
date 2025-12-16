"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdminRole } from "@/types/next-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Calendar, Clock, FileText, TrendingUp, Download } from "lucide-react";

interface EmployeeDetailsData {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    annualLeaveEntitlement: number;
    toilBalance: number;
    createdAt: string;
  };
  balances: {
    annualLeave: {
      used: number;
      total: number;
      remaining: number;
      percentage: number;
    };
    sickLeave: {
      used: number;
      total: number;
      remaining: number;
      percentage: number;
    };
    unpaidLeave: {
      used: number;
      year: number;
    };
    toil: {
      balance: number;
      entries: number;
      pendingEntries: number;
    };
  };
  patterns: {
    preferredMonths: Array<{
      month: number;
      monthName: string;
      requests: number;
    }>;
    averageRequestLength: number;
    mostCommonLeaveType: string;
    totalRequests: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    days: number;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  leaveHistory: Array<{
    id: string;
    startDate: string;
    endDate: string;
    type: string;
    days: number;
    status: string;
    createdAt: string;
    comments?: string;
    approvedBy?: {
      name: string;
    };
  }>;
  toilHistory: Array<{
    id: string;
    date: string;
    type: string;
    hours: number;
    approved: boolean;
    createdAt: string;
    reason: string;
    approvedByUser?: {
      name: string;
    };
  }>;
  stats: {
    joinDate: string;
    totalLeaveRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
  };
}

export default function EmployeeDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<EmployeeDetailsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/employee-details/${params.employeeId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        console.error('Failed to fetch employee details');
      }
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
    } finally {
      setLoading(false);
    }
  }, [params.employeeId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchEmployeeDetails();
  }, [status, session, router, fetchEmployeeDetails]);

  const getStatusBadge = (percentage: number, type: 'annual' | 'sick') => {
    if (type === 'annual') {
      if (percentage > 90) return <Badge variant="destructive">Critical</Badge>;
      if (percentage > 70) return <Badge variant="secondary">High Usage</Badge>;
      return <Badge variant="default">Normal</Badge>;
    } else {
      if (percentage > 100) return <Badge variant="destructive">Exceeded</Badge>;
      if (percentage > 80) return <Badge variant="secondary">High Usage</Badge>;
      return <Badge variant="default">Normal</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/employee-details/${params.employeeId}/export`);
      if (response.ok) {
        const html = await response.text();
        
        // Open in new window for printing/saving as PDF
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
          // Auto-trigger print dialog
          setTimeout(() => {
            newWindow.print();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const getLeaveTypeColor = (type: string) => {
    const colors = {
      'ANNUAL': 'bg-blue-100 text-blue-800',
      'SICK': 'bg-red-100 text-red-800',
      'UNPAID': 'bg-gray-100 text-gray-800',
      'TOIL': 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Employee not found</p>
          <Button onClick={() => router.push("/admin/employee-balances")}>
            Back to Employee Balances
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/employee-balances")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Employee Balances
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {data.employee.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.employee.department} • {data.employee.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={exportReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name || session.user?.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Balance Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Leave</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.balances.annualLeave.used}/{data.balances.annualLeave.total}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {data.balances.annualLeave.remaining} remaining
                  </p>
                  {getStatusBadge(data.balances.annualLeave.percentage, 'annual')}
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(data.balances.annualLeave.percentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">TOIL Balance</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.balances.toil.balance}h</div>
                <p className="text-xs text-muted-foreground">
                  {data.balances.toil.entries} total entries
                </p>
                {data.balances.toil.pendingEntries > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {data.balances.toil.pendingEntries} pending
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.balances.sickLeave.used}/{data.balances.sickLeave.total}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {data.balances.sickLeave.remaining} remaining
                  </p>
                  {getStatusBadge(data.balances.sickLeave.percentage, 'sick')}
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(data.balances.sickLeave.percentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid Leave ({data.balances.unpaidLeave.year})</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.balances.unpaidLeave.used} days</div>
                <p className="text-xs text-muted-foreground">
                  {data.balances.unpaidLeave.used > 5 ? 'High usage' : 'Normal usage'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="history" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="history">Leave History</TabsTrigger>
              <TabsTrigger value="toil">TOIL History</TabsTrigger>
              <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Request History</CardTitle>
                  <CardDescription>
                    All leave requests for {data.employee.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.leaveHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Approved By</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.leaveHistory.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Requested: {formatDate(request.createdAt)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getLeaveTypeColor(request.type)}>
                                {request.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{request.days}</TableCell>
                            <TableCell>
                              <Badge variant={
                                request.status === 'APPROVED' ? 'default' :
                                request.status === 'REJECTED' ? 'destructive' : 'secondary'
                              }>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.approvedBy?.name || '-'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {request.comments || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No leave requests found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="toil" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>TOIL Entry History</CardTitle>
                  <CardDescription>
                    Time Off In Lieu entries and approvals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.toilHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Approved By</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.toilHistory.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formatDate(entry.date)}</div>
                                <div className="text-xs text-muted-foreground">
                                  Created: {formatDate(entry.createdAt)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.type}</Badge>
                            </TableCell>
                            <TableCell>{entry.hours}h</TableCell>
                            <TableCell>
                              <Badge variant={entry.approved ? 'default' : 'secondary'}>
                                {entry.approved ? 'APPROVED' : 'PENDING'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.approvedByUser?.name || '-'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entry.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No TOIL entries found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Patterns</CardTitle>
                    <CardDescription>Leave taking behavior analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Preferred Months</h4>
                      {data.patterns.preferredMonths.length > 0 ? (
                        <div className="space-y-2">
                          {data.patterns.preferredMonths.map((month, index) => (
                            <div key={month.month} className="flex justify-between items-center">
                              <span className="text-sm">{index + 1}. {month.monthName}</span>
                              <Badge variant="outline">{month.requests} requests</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No pattern data available</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Leave Behavior</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Average request length:</span>
                          <span className="font-medium">{data.patterns.averageRequestLength} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Most used leave type:</span>
                          <Badge className={getLeaveTypeColor(data.patterns.mostCommonLeaveType)}>
                            {data.patterns.mostCommonLeaveType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Last 10 leave actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {activity.type} - {activity.days} days
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                              </div>
                            </div>
                            <Badge variant={
                              activity.status === 'APPROVED' ? 'default' :
                              activity.status === 'REJECTED' ? 'destructive' : 'secondary'
                            }>
                              {activity.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Statistics</CardTitle>
                    <CardDescription>Overall account metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Join Date:</span>
                        <span className="font-medium">{formatDate(data.stats.joinDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Requests:</span>
                        <span className="font-medium">{data.stats.totalLeaveRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved:</span>
                        <span className="font-medium text-green-600">{data.stats.approvedRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <span className="font-medium text-yellow-600">{data.stats.pendingRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rejected:</span>
                        <span className="font-medium text-red-600">{data.stats.rejectedRequests}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Leave Entitlements</CardTitle>
                    <CardDescription>Annual entitlements and policies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Annual Leave Entitlement:</span>
                        <span className="font-medium">{data.employee.annualLeaveEntitlement} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sick Leave Entitlement:</span>
                        <span className="font-medium">3 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current TOIL Balance:</span>
                        <span className="font-medium">{data.employee.toilBalance}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Department:</span>
                        <Badge variant="outline">{data.employee.department}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}